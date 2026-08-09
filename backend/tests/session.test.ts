import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';
import { voucherService } from '../src/services/VoucherService';

describe('Customer Session Tests', () => {
  let poolQueryMock: any;
  let vouchers: any[] = [];
  let sessions: any[] = [];

  beforeEach(() => {
    vouchers = [];
    sessions = [];

    poolQueryMock = vi.spyOn(pool, 'query').mockImplementation(async (queryText: string, values?: any[]): Promise<any> => {
      if (queryText.includes('SELECT * FROM vouchers WHERE code_hash')) {
        const v = vouchers.find(v => v.code_hash === values![0]);
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('UPDATE vouchers SET status')) {
        const v = vouchers.find(v => v.id === values![1]);
        if (v) v.status = values![0];
        return { rows: v ? [v] : [] };
      }
      if (queryText.includes('INSERT INTO sessions')) {
        const newS = {
          id: sessions.length + 1,
          voucher_id: values![0],
          router_id: values![1],
          username: values![2],
          ip_address: values![3],
          mac_address: values![4],
          data_used: 0,
          started_at: new Date().toISOString()
        };
        sessions.push(newS);
        return { rows: [newS] };
      }
      if (queryText.includes('SELECT v.status, s.ip_address')) {
        const s = sessions.find(s => s.voucher_id === values![0]);
        if (!s) return { rows: [] };
        const v = vouchers.find(v => v.id === s.voucher_id);
        return { rows: [{ ...s, status: v.status, data_allowance: 1000, duration: 60 }] };
      }
      return { rows: [] };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid voucher code', async () => {
    const res = await request(app).post('/api/sessions/login').send({ voucherCode: 'INVALID' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid voucher code');
  });

  it('rejects unused/pending voucher', async () => {
    const hash = voucherService.hashVoucher('PENDING1');
    vouchers.push({ id: 1, code_hash: hash, status: 'unused', activation_status: 'PENDING' });

    const res = await request(app).post('/api/sessions/login').send({ voucherCode: 'PENDING1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Voucher is not yet activated on the network');
  });

  it('rejects expired voucher', async () => {
    const hash = voucherService.hashVoucher('EXPIRED1');
    vouchers.push({ id: 2, code_hash: hash, status: 'expired', activation_status: 'ACTIVATED' });

    const res = await request(app).post('/api/sessions/login').send({ voucherCode: 'EXPIRED1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Voucher is expired');
  });

  it('rejects exhausted voucher', async () => {
    const hash = voucherService.hashVoucher('EXHAUSTED1');
    vouchers.push({ id: 3, code_hash: hash, status: 'exhausted', activation_status: 'ACTIVATED' });

    const res = await request(app).post('/api/sessions/login').send({ voucherCode: 'EXHAUSTED1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Voucher data exhausted');
  });

  it('accepts valid active voucher and creates session', async () => {
    const hash = voucherService.hashVoucher('VALID123');
    vouchers.push({ id: 4, code_hash: hash, status: 'active', activation_status: 'ACTIVATED', router_id: 1 });

    const res = await request(app).post('/api/sessions/login').send({ voucherCode: 'VALID123', ipAddress: '10.0.0.1', macAddress: 'AA:BB:CC:DD:EE:FF' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionToken).toBeDefined();

    const statusRes = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${res.body.sessionToken}`);
    
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.voucherStatus).toBe('active');
    expect(statusRes.body.ipAddress).toBe('10.0.0.1');
  });
});
