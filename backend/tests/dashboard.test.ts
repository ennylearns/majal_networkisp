import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';

describe('Admin Dashboard API', () => {
  let poolQueryMock: any;

  beforeEach(() => {
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      const q = queryText.toLowerCase();

      const normalizedQuery = q.replace(/\s+/g, ' ');

      if (normalizedQuery.includes('select coalesce(sum(amount), 0) as today_revenue')) {
        return { rows: [{ today_revenue: 1500.00 }] };
      }
      
      if (normalizedQuery.includes('select count(distinct voucher_id) as active_customers')) {
         return { rows: [{ active_customers: '10' }] };
      }
      
      if (normalizedQuery.includes('select count(*) as active_sessions from sessions where ended_at is null')) {
        return { rows: [{ active_sessions: '5' }] };
      }
      
      if (normalizedQuery.includes('select count(*) as total_customers from customers')) {
        return { rows: [{ total_customers: '100' }] };
      }
      
      if (normalizedQuery.includes('select count(*) as total_vouchers from vouchers')) {
        return { rows: [{ total_vouchers: '200' }] };
      }
      
      if (normalizedQuery.includes("filter (where status = 'online') as online_count")) {
        return { rows: [{ online_count: '2', offline_count: '1' }] };
      }
      
      if (normalizedQuery.includes('from sessions s')) {
        return {
          rows: [
            {
              id: 1,
              username: 'VOUCHER-123',
              router_name: 'Router A',
              plan_name: 'Basic Plan',
              data_used: '1048576',
              ip_address: '192.168.88.2',
              mac_address: 'AA:BB:CC:DD:EE:FF',
              started_at: '2023-01-01T10:00:00Z'
            }
          ]
        };
      }
      
      if (normalizedQuery.includes('revenue_today')) {
        return { rows: [{ revenue_today: '500', revenue_week: '3500', revenue_month: '15000' }] };
      }
      
      if (normalizedQuery.includes('group by p.id, p.name')) {
        return {
          rows: [
            { plan_name: 'Basic Plan', revenue: '10000', units: '100' }
          ]
        };
      }
      
      if (normalizedQuery.includes('group by r.id, r.name')) {
        return {
          rows: [
            { router_name: 'Router A', revenue: '8000' }
          ]
        };
      }

      console.error('UNMATCHED QUERY:', q);
      return { rows: [] };
    });
  });

  afterEach(() => {
    poolQueryMock.mockRestore();
  });

  it('GET /api/dashboard/summary should return business snapshot', async () => {
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todayRevenue: 1500,
      activeCustomers: 10,
      activeSessions: 5,
      totalCustomers: 100,
      totalVouchers: 200,
      onlineRouters: 2,
      offlineRouters: 1
    });
  });

  it('GET /api/dashboard/active-sessions should return active sessions across routers', async () => {
    const res = await request(app).get('/api/dashboard/active-sessions').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual({
      id: 1,
      username: 'VOUCHER-123',
      routerName: 'Router A',
      planName: 'Basic Plan',
      dataUsed: '1048576',
      ipAddress: '192.168.88.2',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      startedAt: '2023-01-01T10:00:00Z'
    });
  });

  it('GET /api/dashboard/analytics/revenue should return revenue breakdown', async () => {
    const res = await request(app).get('/api/dashboard/analytics/revenue').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      today: 500,
      thisWeek: 3500,
      thisMonth: 15000,
      byPlan: [
        { planName: 'Basic Plan', revenue: 10000, units: 100 }
      ],
      byRouter: [
        { routerName: 'Router A', revenue: 8000 }
      ]
    });
  });
});
