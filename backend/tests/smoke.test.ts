import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app, setMikroTikService, setPaymentService } from '../src/app';
import { FakeMikroTikService } from '../src/services/MikroTikService';
import { FakePaymentService } from '../src/services/PaymentService';
import { pool } from '../src/db';

describe('Backend Foundation Smoke Test', () => {
  let fakeMikroTik: FakeMikroTikService;
  let fakePayment: FakePaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] } as any);
    fakeMikroTik = new FakeMikroTikService();
    fakePayment = new FakePaymentService();
    setMikroTikService(fakeMikroTik);
    setPaymentService(fakePayment);
  });

  describe('Admin Auth Seam', () => {
    it('should authenticate admin with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({ email: 'admin@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
    });
  });

  describe('MikroTikService Seam', () => {
    it('should simulate success condition', async () => {
      fakeMikroTik.setCondition('success');
      const result = await fakeMikroTik.createUser(1, 'test', 'default');
      expect(result).toBe(true);
    });

    it('should simulate unreachable condition', async () => {
      fakeMikroTik.setCondition('unreachable');
      await expect(fakeMikroTik.createUser(1, 'test', 'default')).rejects.toThrow('Router is unreachable');
    });

    it('should check router status as offline when unreachable', async () => {
      fakeMikroTik.setCondition('unreachable');
      const status = await fakeMikroTik.getRouterStatus(1);
      expect(status.isOnline).toBe(false);
    });
  });

  describe('PaymentService Seam', () => {
    it('should simulate valid webhook', () => {
      fakePayment.setCondition('valid');
      const isValid = fakePayment.verifyWebhook({}, 'signature');
      expect(isValid).toBe(true);
    });

    it('should simulate tampered webhook', () => {
      fakePayment.setCondition('tampered');
      const isValid = fakePayment.verifyWebhook({}, 'signature');
      expect(isValid).toBe(false);
    });
  });
});
