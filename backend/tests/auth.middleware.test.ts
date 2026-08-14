import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Admin Route Authentication Enforcement', () => {
  it('should return 401 for unauthenticated requests to protected endpoints', async () => {
    const resRouter = await request(app).post('/api/routers').send({});
    expect(resRouter.status).toBe(401);

    const resPlan = await request(app).post('/api/plans').send({});
    expect(resPlan.status).toBe(401);

    const resAudit = await request(app).get('/api/audit-logs');
    expect(resAudit.status).toBe(401);
  });

  it('should return 401 for invalid tokens', async () => {
    const res = await request(app)
      .get('/api/routers')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(res.status).toBe(401);
  });

  it('should not return 401 for public routes without token', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).not.toBe(401);
  });
});
