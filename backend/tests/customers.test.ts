import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';

describe('Customers API', () => {
  let poolQueryMock: any;
  const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw';

  beforeEach(() => {
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      const q = queryText.toLowerCase();
      if (q.includes('select c.*') && q.includes('coalesce(') && q.includes('from customers c')) {
        const customer = {
          id: 1,
          email: 'test-customer@example.com',
          phone_number: '1234567890',
          created_at: '2023-01-01T10:00:00Z',
          transactions: [
            {
              id: 1,
              plan_name: 'Test Plan',
              amount: '10.00',
              status: 'successful',
              created_at: '2023-01-01T10:00:00Z',
              paystack_reference: 'test-ref'
            }
          ]
        };

        if (values && values.length > 0) {
          if (values[0] === 1) {
            return { rows: [customer] };
          }
          return { rows: [] };
        }

        return { rows: [customer] };
      }
      
      return { rows: [] };
    });
  });

  afterEach(() => {
    poolQueryMock.mockRestore();
  });

  it('GET /api/customers should require admin', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('GET /api/customers should return customers with transactions', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    const customer = res.body.find((c: any) => c.email === 'test-customer@example.com');
    expect(customer).toBeDefined();
    expect(customer.phone_number).toBe('1234567890');
    expect(customer.transactions).toBeDefined();
    expect(Array.isArray(customer.transactions)).toBe(true);
    expect(customer.transactions.length).toBeGreaterThan(0);
    expect(customer.transactions[0].plan_name).toBe('Test Plan');
    expect(customer.transactions[0].status).toBe('successful');
  });

  it('GET /api/customers/:id should require admin', async () => {
    const res = await request(app).get('/api/customers/1');
    expect(res.status).toBe(401);
  });

  it('GET /api/customers/:id should return a specific customer profile with transactions', async () => {
    const res = await request(app)
      .get('/api/customers/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.email).toBe('test-customer@example.com');
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].plan_name).toBe('Test Plan');
  });

  it('GET /api/customers/:id should return 400 for invalid non-numeric ID', async () => {
    const res = await request(app)
      .get('/api/customers/abc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid customer ID');
  });

  it('GET /api/customers/:id should return 404 when customer not found', async () => {
    const res = await request(app)
      .get('/api/customers/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Customer not found');
  });
});
