import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app, setMikroTikService } from '../src/app';
import { FakeMikroTikService } from '../src/services/MikroTikService';
import { pool } from '../src/db';

describe('Plan Management', () => {
  let fakeMikroTik: FakeMikroTikService;
  let poolQueryMock: any;

  beforeEach(async () => {
    fakeMikroTik = new FakeMikroTikService();
    setMikroTikService(fakeMikroTik);
    
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      if (queryText.includes('INSERT INTO plans')) {
        return { rows: [{ id: 1, name: values![0], price: values![1], data_allowance: values![2], duration: values![3], download_speed: values![4], upload_speed: values![5], mikrotik_profile_name: values![6], enabled: true }] };
      }
      if (queryText.includes('SELECT id FROM routers')) {
        return { rows: [{ id: 1 }] };
      }
      if (queryText.includes('UPDATE plans SET enabled =')) {
        const enabled = queryText.includes('enabled = true');
        return { rows: [{ id: values![0], enabled }] };
      }
      if (queryText.includes('SELECT * FROM plans')) {
        return {
          rows: [
            {
              id: 1,
              name: 'Daily Pass',
              price: '200.00',
              data_allowance: null,
              duration: 1,
              download_speed: '10M',
              upload_speed: '5M',
              mikrotik_profile_name: 'Daily_Pass',
              enabled: true,
            },
            {
              id: 2,
              name: 'Weekly Pro',
              price: '1000.00',
              data_allowance: '53687091200', // 50 GB in bytes
              duration: 7,
              download_speed: '20M',
              upload_speed: '10M',
              mikrotik_profile_name: 'Weekly_Pro',
              enabled: true,
            },
          ],
        };
      }
      return { rows: [] };
    });
  });

  afterEach(() => {
    poolQueryMock.mockRestore();
  });

  it('should create a plan and push to routers', async () => {
    const res = await request(app)
      .post('/api/plans')
      .send({
        name: 'Basic',
        price: 1000,
        data_allowance: 1000000000, // 1GB
        duration: 30, // 30 days
        download_speed: '10M',
        upload_speed: '5M'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.plan).toHaveProperty('id');
    expect(res.body.plan.mikrotik_profile_name).toBe('Basic');
  });

  it('should enable and disable a plan', async () => {
    const disableRes = await request(app).put(`/api/plans/1/disable`);
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.plan.enabled).toBe(false);

    const enableRes = await request(app).put(`/api/plans/1/enable`);
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.plan.enabled).toBe(true);
  });

  describe('GET /api/plans — portal field normalization', () => {
    it('returns plans with data_limit_bytes, duration_minutes, speed_down_kbps, speed_up_kbps', async () => {
      const res = await request(app).get('/api/plans');
      expect(res.status).toBe(200);

      const plan = res.body[1]; // Weekly Pro
      expect(plan).toHaveProperty('data_limit_bytes', 53687091200);
      expect(plan).toHaveProperty('duration_minutes', 7 * 24 * 60); // 7 days → minutes
      expect(plan).toHaveProperty('speed_down_kbps', 20 * 1000); // 20M → 20000 kbps (decimal metric)
      expect(plan).toHaveProperty('speed_up_kbps', 10 * 1000);
    });

    it('returns null data_limit_bytes for unlimited plans and null speed caps as null', async () => {
      const res = await request(app).get('/api/plans');
      expect(res.status).toBe(200);

      const dailyPlan = res.body[0]; // Daily Pass — data_allowance: null
      expect(dailyPlan.data_limit_bytes).toBeNull();
    });

    it('does NOT expose raw DB column names (data_allowance, download_speed, upload_speed, duration) in the portal response', async () => {
      const res = await request(app).get('/api/plans');
      expect(res.status).toBe(200);

      for (const plan of res.body) {
        expect(plan).not.toHaveProperty('data_allowance');
        expect(plan).not.toHaveProperty('download_speed');
        expect(plan).not.toHaveProperty('upload_speed');
        expect(plan).not.toHaveProperty('duration');
      }
    });
  });
});
