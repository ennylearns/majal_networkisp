import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app, setPaymentService } from '../src/app';
import { FakePaymentService } from '../src/services/PaymentService';
import { pool } from '../src/db';

describe('Checkout and Webhook Tests', () => {
  let fakePaymentService: FakePaymentService;
  let poolQueryMock: any;
  let transactions: any[] = [];
  let customers: any[] = [];

  beforeEach(async () => {
    fakePaymentService = new FakePaymentService();
    setPaymentService(fakePaymentService);
    transactions = [];
    customers = [];
    
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      if (queryText.includes('SELECT * FROM plans WHERE id')) {
        return { rows: [{ id: values![0], name: 'Test Plan', price: 10.00, enabled: true }] };
      }
      if (queryText.includes('SELECT * FROM customers WHERE email')) {
        const c = customers.find(c => c.email === values![0]);
        return { rows: c ? [c] : [] };
      }
      if (queryText.includes('INSERT INTO customers')) {
        const newC = { id: customers.length + 1, email: values![0], phone_number: values![1] };
        customers.push(newC);
        return { rows: [newC] };
      }
      if (queryText.includes('INSERT INTO transactions')) {
        const newT = { id: transactions.length + 1, customer_id: values![0], plan_id: values![1], paystack_reference: values![2], amount: values![3], status: values![4] };
        transactions.push(newT);
        return { rows: [newT] };
      }
      if (queryText.includes('SELECT t.*, v.activation_status')) {
        const t = transactions.find(t => t.paystack_reference === values![0]);
        // For testing, add activation_status to t if it's there
        return { rows: t ? [t] : [] };
      }
      if (queryText.includes('SELECT * FROM transactions WHERE paystack_reference')) {
        const t = transactions.find(t => t.paystack_reference === values![0]);
        return { rows: t ? [t] : [] };
      }
      if (queryText.includes('UPDATE transactions')) {
        const t = transactions.find(t => t.paystack_reference === values![0] && t.status === 'pending');
        if (t) t.status = 'successful';
        return { rows: t ? [t] : [] };
      }
      return { rows: [] };
    });
  });

  afterEach(() => {
    poolQueryMock.mockRestore();
    vi.restoreAllMocks();
  });

  it('should initialize checkout when provided email and phone number', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({
        planId: 1,
        email: 'customer@example.com',
        phoneNumber: '1234567890'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('checkoutUrl');
    expect(response.body).toHaveProperty('reference');

    expect(customers.length).toBe(1);
    expect(transactions.length).toBe(1);
    expect(transactions[0].status).toBe('pending');
  });

  it('should verify payment webhook and mark transaction successful', async () => {
    const checkoutResponse = await request(app)
      .post('/api/checkout')
      .send({
        planId: 1,
        email: 'customer@example.com',
        phoneNumber: '1234567890'
      });
    const reference = checkoutResponse.body.reference;

    const webhookResponse = await request(app)
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'valid_signature')
      .send({
        event: 'charge.success',
        data: {
          reference: reference,
          amount: 1000
        }
      });

    expect(webhookResponse.status).toBe(200);
    expect(transactions[0].status).toBe('successful');
  });

  it('should reject tampered webhook', async () => {
    fakePaymentService.setCondition('tampered');
    
    const webhookResponse = await request(app)
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'invalid_signature')
      .send({
        event: 'charge.success',
        data: { reference: 'dummy_ref' }
      });

    expect(webhookResponse.status).toBe(400);
  });

  it('should be idempotent for duplicate webhooks', async () => {
    const checkoutResponse = await request(app)
      .post('/api/checkout')
      .send({ planId: 1, email: 'customer@example.com', phoneNumber: '1234567890' });
    const reference = checkoutResponse.body.reference;

    await request(app)
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'valid_signature')
      .send({ event: 'charge.success', data: { reference } });

    const duplicateWebhookResponse = await request(app)
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'valid_signature')
      .send({ event: 'charge.success', data: { reference } });

    expect(duplicateWebhookResponse.status).toBe(200);
    expect(transactions.length).toBe(1);
    expect(transactions[0].status).toBe('successful');
  });

  it('should return payment status on GET /api/payments/:reference', async () => {
    const reference = 'ref_status_test_1';
    transactions.push({ id: 10, customer_id: 1, plan_id: 1, paystack_reference: reference, amount: 1000, status: 'successful', activation_status: 'ACTIVATED' });
    
    const response = await request(app).get(`/api/payments/${reference}`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('successful');
    expect(response.body.activation_status).toBe('ACTIVATED');
  });

  it('should fallback to PaymentService.verifyTransaction if pending and threshold exceeded', async () => {
    const reference = 'ref_status_test_2';
    // Create transaction older than 10 seconds
    const oldDate = new Date(Date.now() - 15000).toISOString();
    transactions.push({ id: 11, customer_id: 1, plan_id: 1, paystack_reference: reference, amount: 1000, status: 'pending', created_at: oldDate });
    
    // Default condition is 'valid', so verifyTransaction returns success
    const response = await request(app).get(`/api/payments/${reference}`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('successful');
    expect(transactions.find(t => t.paystack_reference === reference)?.status).toBe('successful');
  });

  it('should NOT fallback to PaymentService if pending but threshold NOT exceeded', async () => {
    const reference = 'ref_status_test_3';
    // Create transaction younger than 10 seconds
    const newDate = new Date(Date.now() - 2000).toISOString();
    transactions.push({ id: 12, customer_id: 1, plan_id: 1, paystack_reference: reference, amount: 1000, status: 'pending', created_at: newDate });
    
    const response = await request(app).get(`/api/payments/${reference}`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('pending');
    expect(transactions.find(t => t.paystack_reference === reference)?.status).toBe('pending');
  });
});
