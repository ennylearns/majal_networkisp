import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db';

describe('Router Provisioning REST API Integration', () => {
  const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImlhdCI6MTc4NjcyMTMwNX0.q3bZDCZzhhB6pGwEsnhCGlB_uofIVZ_uy_OYACv_-fw';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/routers', () => {
    it('should require admin authorization', async () => {
      const res = await request(app).post('/api/routers').send({ name: 'Router Alpha', location: 'Lobby' });
      expect(res.status).toBe(401);
    });

    it('should create router, generate provisioning credentials, and return token and metadata', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ id: 42 }] } as any) // INSERT INTO routers
        .mockResolvedValueOnce({ rows: [{ token: 'tok-router-42' }] } as any) // INSERT INTO router_provisioning_tokens
        .mockResolvedValueOnce({ rowCount: 1 } as any) // UPDATE routers
        .mockResolvedValueOnce({ rowCount: 1 } as any); // audit log

      const res = await request(app)
        .post('/api/routers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Router Alpha', location: 'Lobby' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 42,
        token: 'tok-router-42',
        tunnelIp: '10.100.0.42',
        apiPassword: expect.stringMatching(/^[0-9a-f]{32}$/),
        command: expect.stringContaining('/provision/tok-router-42')
      });
    });
  });

  describe('POST /api/routers/:id/provision-token', () => {
    it('should require admin authorization', async () => {
      const res = await request(app).post('/api/routers/1/provision-token').send();
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid router id', async () => {
      const res = await request(app)
        .post('/api/routers/abc/provision-token')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid router ID' });
    });

    it('should return 404 if router does not exist', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/api/routers/999/provision-token')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Router not found' });
    });

    it('should generate token, rotate credentials, and return token and credential metadata', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Core Router' }] } as any) // check router
        .mockResolvedValueOnce({ rows: [{ token: 'new-token-5' }] } as any) // insert token
        .mockResolvedValueOnce({ rowCount: 1 } as any) // update routers
        .mockResolvedValueOnce({ rowCount: 1 } as any); // audit log

      const res = await request(app)
        .post('/api/routers/5/provision-token')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 5,
        token: 'new-token-5',
        tunnelIp: '10.100.0.5',
        apiPassword: expect.stringMatching(/^[0-9a-f]{32}$/),
        command: expect.stringContaining('/provision/new-token-5')
      });
    });
  });

  describe('GET /api/routers/:id/provision.rsc', () => {
    it('should require admin authorization', async () => {
      const res = await request(app).get('/api/routers/1/provision.rsc');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid router id', async () => {
      const res = await request(app)
        .get('/api/routers/xyz/provision.rsc')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid router ID' });
    });

    it('should return 404 if router not found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get('/api/routers/123/provision.rsc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Router not found' });
    });

    it('should return plain text .rsc script with stored wireguard_tunnel_ip and api_password', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            name: 'Router 7',
            hotspot_subnet: '10.0.0.0/24',
            hotspot_gateway: '10.0.0.1',
            hotspot_pool_range: '10.0.0.10-10.0.0.250',
            wireguard_peer_config: 'endpoint=wg.majal.com:51820',
            wireguard_public_key: 'peer-pub-key-7',
            wireguard_tunnel_ip: '10.100.0.7',
            api_password: 'supersecretapipassword7'
          }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{ token: 'active-token-7' }]
        } as any);

      const res = await request(app)
        .get('/api/routers/7/provision.rsc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('/user add name=majal-api password="supersecretapipassword7" group=full');
      expect(res.text).toContain('/ip address add address=10.100.0.7/24 interface=wireguard1');
      expect(res.text).toContain('/ip service set www address=10.100.0.0/16 disabled=no');
      expect(res.text).toContain('/ip service set www-ssl disabled=yes');
      expect(res.text).toContain('/system identity set name="MAJAL-Router-7"');
    });
  });

  describe('GET /provision/:token', () => {
    it('should return rendered .rsc script containing wireguard tunnel IP and majal-api credentials', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{ id: 1, router_id: 10, expires_at: new Date(Date.now() + 3600000), used_at: null, revoked_at: null }]
        } as any) // validateAndUseToken: check token
        .mockResolvedValueOnce({ rowCount: 1 } as any) // validateAndUseToken: update used_at
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            hotspot_subnet: '172.16.0.0/24',
            hotspot_gateway: '172.16.0.1',
            hotspot_pool_range: '172.16.0.10-172.16.0.250',
            wireguard_peer_config: 'endpoint=wg.majal.com:51820',
            wireguard_public_key: 'peer-pub-key-10',
            wireguard_tunnel_ip: '10.100.0.10',
            api_password: 'router10password'
          }]
        } as any); // get router

      const res = await request(app).get('/provision/valid-token-10');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('/user add name=majal-api password="router10password" group=full');
      expect(res.text).toContain('/ip address add address=10.100.0.10/24 interface=wireguard1');
      expect(res.text).toContain('/system identity set name="MAJAL-Router-10"');
    });
  });
});
