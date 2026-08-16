import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';

describe('Customers API', () => {
  let poolQueryMock: any;

  beforeEach(() => {
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      const q = queryText.toLowerCase();
      if (q.includes('select c.*') && q.includes('coalesce(') && q.includes('from customers c')) {
        return {
          rows: [
            {
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
            }
          ]
        };
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
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw';
    
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
});
