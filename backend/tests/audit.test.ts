import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app, auditService } from '../src/app';
import { pool } from '../src/db';

describe('Audit Trail API', () => {
  let poolQueryMock: any;
  let fakeLogs: any[] = [];

  beforeEach(() => {
    fakeLogs = [];
    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      if (queryText.includes('INSERT INTO audit_logs')) {
        fakeLogs.push({
          id: fakeLogs.length + 1,
          admin_id: values![0],
          action_type: values![1],
          target_entity: values![2],
          target_entity_id: values![3],
          metadata: values![4]
        });
        return { rows: [] };
      }
      if (queryText.includes('SELECT id, admin_id, action_type')) {
        let res = fakeLogs;
        if (queryText.includes('action_type = $')) {
          res = res.filter(l => l.action_type === values![0]);
        }
        return { rows: res };
      }
      if (queryText.includes('INSERT INTO plans')) {
        return { rows: [{ id: 1, name: values![0], price: values![1], data_allowance: values![2], duration: values![3], download_speed: values![4], upload_speed: values![5], mikrotik_profile_name: values![6], enabled: true }] };
      }
      if (queryText.includes('SELECT id FROM routers')) {
        return { rows: [{ id: 1 }] };
      }
      return { rows: [] };
    });
  });

  afterEach(() => {
    poolQueryMock.mockRestore();
  });

  it('should log plan creation and allow querying it', async () => {
    // 1. Create a plan, which should trigger an audit log
    const res = await request(app)
      .post('/api/plans').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw')
      .send({
        name: 'Audit Plan',
        price: 50,
        data_allowance: 10,
        duration: 30,
        download_speed: '5M',
        upload_speed: '2M'
      });
    expect(res.status).toBe(201);
    
    // Wait a little bit for the async log to complete
    await new Promise(r => setTimeout(r, 100));

    // 2. Query audit logs
    const auditRes = await request(app).get('/api/audit-logs').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.length).toBeGreaterThan(0);
    expect(auditRes.body[0].action_type).toBe('PLAN_CREATED');
    expect(auditRes.body[0].target_entity).toBe('plan');
    expect(auditRes.body[0].metadata.name).toBe('Audit Plan');
  });

  it('should filter audit logs by actionType', async () => {
    await auditService.logAction(null, 'TEST_ACTION', 'test', 1, {});
    await auditService.logAction(null, 'OTHER_ACTION', 'test', 2, {});

    const auditRes = await request(app).get('/api/audit-logs?actionType=TEST_ACTION').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.length).toBe(1);
    expect(auditRes.body[0].action_type).toBe('TEST_ACTION');
  });
});

