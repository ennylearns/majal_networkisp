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
});
