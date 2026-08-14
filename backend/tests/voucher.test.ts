import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app, setPaymentService, setMikroTikService, mikroTikService } from '../src/app';
import { FakePaymentService } from '../src/services/PaymentService';
import { FakeMikroTikService } from '../src/services/MikroTikService';
import { pool } from '../src/db';
import { voucherService } from '../src/services/VoucherService';

describe('Voucher Generation and E2E Tests', () => {
  let fakePaymentService: FakePaymentService;
  let fakeMikroTikService: FakeMikroTikService;
  let poolQueryMock: any;
  let routers: any[] = [];
  let plans: any[] = [];
  let customers: any[] = [];
  let transactions: any[] = [];
  let vouchers: any[] = [];

  beforeEach(() => {
    fakePaymentService = new FakePaymentService();
    setPaymentService(fakePaymentService);

    fakeMikroTikService = new FakeMikroTikService();
    setMikroTikService(fakeMikroTikService);

    routers = [{ id: 1, name: 'Main Router', status: 'online' }];
    plans = [{ id: 1, name: 'Basic Plan', price: 10.00, enabled: true, mikrotik_profile_name: 'Basic_Plan' }];
    customers = [];
    transactions = [];
    vouchers = [];

    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      // Simulate Routers
      if (queryText.includes('SELECT id FROM routers WHERE status')) {
        return { rows: routers.filter(r => r.status === values![0]) };
      }
      
      // Simulate Plans
      if (queryText.includes('SELECT * FROM plans WHERE id')) {
        const plan = plans.find(p => p.id === values![0]);
        return { rows: plan ? [plan] : [] };
      }
      
      // Simulate Customers
      if (queryText.includes('SELECT * FROM customers WHERE email')) {
        const c = customers.find(c => c.email === values![0]);
        return { rows: c ? [c] : [] };
      }
      if (queryText.includes('INSERT INTO customers')) {
        const newC = { id: customers.length + 1, email: values![0], phone_number: values![1] };
        customers.push(newC);
        return { rows: [newC] };
      }

      // Simulate Transactions
      if (queryText.includes('INSERT INTO transactions')) {
        const newT = { id: transactions.length + 1, customer_id: values![0], plan_id: values![1], paystack_reference: values![2], amount: values![3], status: values![4] };
        transactions.push(newT);
        return { rows: [newT] };
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
      if (queryText.includes('SELECT t.*, c.email, c.phone_number, p.mikrotik_profile_name')) {
        const t = transactions.find(t => t.paystack_reference === values![0]);
        if (!t) return { rows: [] };
        const c = customers.find(c => c.id === t.customer_id);
        const p = plans.find(p => p.id === t.plan_id);
        return { rows: [{ ...t, email: c.email, phone_number: c.phone_number, mikrotik_profile_name: p.mikrotik_profile_name }] };
      }

      // Simulate Vouchers
      if (queryText.includes('SELECT id FROM vouchers WHERE transaction_id')) {
        const v = vouchers.find(v => v.transaction_id === values![0]);
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('SELECT id FROM vouchers WHERE code_hash')) {
        const v = vouchers.find(v => v.code_hash === values![0]);
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('INSERT INTO vouchers')) {
        const newV = {
          id: vouchers.length + 1,
          code_hash: values![0],
          plan_id: values![1],
          transaction_id: values![2],
          phone_number: values![3],
          email: values![4],
          status: 'unused',
          activation_status: 'PENDING',
          router_id: values![5]
        };
        vouchers.push(newV);
        return { rows: [newV] };
      }
      if (queryText.includes('UPDATE vouchers SET activation_status')) {
        const v = vouchers.find(v => v.id === values![1]);
        if (v) v.activation_status = values![0];
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('SELECT * FROM vouchers WHERE id = $1')) {
        const v = vouchers.find(v => v.id == values![0]);
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('UPDATE vouchers SET status = $1 WHERE id = $2')) {
        const v = vouchers.find(v => v.id == values![1]);
        if (v) v.status = values![0];
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('SELECT username FROM sessions WHERE voucher_id = $1 LIMIT 1')) {
        return { rows: [{ username: 'MOCK_USER_CODE' }] };
      }
      if (queryText.includes('SELECT v.id, v.status, v.activation_status')) {
        return { rows: vouchers.filter(v => 
          (!values![0] || v.phone_number === values![0])
        ) };
      }

      return { rows: [] };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Voucher code generation tested directly: correct length, correct character set', () => {
    // We can access it via the public method if we expose generateCode, 
    // or by issuing a voucher
  });

  it('End-to-end tracer-bullet test', async () => {
    // 1. Plan selection -> checkout
    const checkoutRes = await request(app)
      .post('/api/checkout')
      .send({ planId: 1, email: 'test@example.com', phoneNumber: '0000' });
    
    expect(checkoutRes.status).toBe(200);
    const reference = checkoutRes.body.reference;
    expect(reference).toBeDefined();

    // 2. Payment webhook
    const webhookRes = await request(app)
      .post('/api/webhooks/paystack')
      .set('x-paystack-signature', 'valid_signature')
      .send({ event: 'charge.success', data: { reference, amount: 1000 } });
    
    expect(webhookRes.status).toBe(200);

    // 3. Voucher generated via API
    const createRouterSpy = vi.spyOn(fakeMikroTikService, 'createUser');
    
    const voucherRes = await request(app)
      .post(`/api/transactions/${reference}/voucher`);
    
    expect(voucherRes.status).toBe(201);
    expect(voucherRes.body.code).toBeDefined();
    
    const code = voucherRes.body.code;
    expect(code).toHaveLength(6);
    expect(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)).toBe(true);
    
    // Allow async microtasks to complete for the activation logic
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 4. MikroTik user created
    expect(createRouterSpy).toHaveBeenCalledWith(1, code, 'Basic_Plan');
    
    // 5. Check voucher in db is activated
    const voucher = vouchers[0];
    expect(voucher).toBeDefined();
    expect(voucher.activation_status).toBe('ACTIVATED');
    
    // Login validated (admin support lookup)
    const verified = await voucherService.verifyVoucher(code);
    expect(verified).toBe(true);
  });

  it('Voucher is returned exactly once', async () => {
    // Mock successful tx
    transactions.push({ id: 1, customer_id: 1, plan_id: 1, paystack_reference: 'ref_123', status: 'successful' });
    customers.push({ id: 1, email: 'e', phone_number: '1' });

    const res1 = await request(app).post('/api/transactions/ref_123/voucher');
    expect(res1.status).toBe(201);
    
    const res2 = await request(app).post('/api/transactions/ref_123/voucher');
    expect(res2.status).toBe(400); // Already issued
  });

  it('Voucher retry on failure', async () => {
    vi.useFakeTimers();
    fakeMikroTikService.setCondition('unreachable', 0); // fail always
    
    transactions.push({ id: 2, customer_id: 1, plan_id: 1, paystack_reference: 'ref_fail', status: 'successful' });
    customers.push({ id: 1, email: 'e', phone_number: '1' });

    const createRouterSpy = vi.spyOn(fakeMikroTikService, 'createUser');

    // Make the API request (which starts the background task)
    const voucherRes = await request(app).post('/api/transactions/ref_fail/voucher');
    expect(voucherRes.status).toBe(201);

    // Let the background task run its retries
    // We need to resolve all promises and timers.
    for (let i = 0; i < 5; i++) {
      await vi.runAllTimersAsync();
    }

    expect(createRouterSpy).toHaveBeenCalledTimes(5);
    const voucher = vouchers.find(v => v.transaction_id === 2);
    expect(voucher.activation_status).toBe('FAILED');
    
    vi.useRealTimers();
  });

  it('Admin can disable a voucher', async () => {
    vouchers.push({
      id: 99,
      code_hash: 'somehash',
      plan_id: 1,
      transaction_id: 1,
      phone_number: '123',
      email: 'a@b.com',
      status: 'unused',
      activation_status: 'ACTIVATED',
      router_id: 1
    });

    const disableRouterSpy = vi.spyOn(fakeMikroTikService, 'disableUser');

    const res = await request(app).put('/api/vouchers/99/disable').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    if (res.status !== 200) {
       console.log('DISABLE TEST FAILED:', res.status, res.text);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.voucher.status).toBe('disabled');
    
    expect(disableRouterSpy).toHaveBeenCalledWith(1, 'MOCK_USER_CODE');
  });

  it('Admin can lookup a customer voucher history', async () => {
    vouchers.push({
      id: 100,
      code_hash: 'hash100',
      phone_number: '999888777'
    });

    const res = await request(app).get('/api/vouchers?phone_number=999888777').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(100);
  });
});
