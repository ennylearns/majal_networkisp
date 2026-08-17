import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealMikroTikService } from '../src/services/RealMikroTikService';
import { pool } from '../src/db';

describe('RealMikroTikService', () => {
  let service: RealMikroTikService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RealMikroTikService();
  });

  it('should throw error when router is not found in database on REST operation', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

    await expect(service.createUser(999, 'user', 'default')).rejects.toThrow('Router 999 not found');
  });

  it('should throw error when router has no wireguard_tunnel_ip on REST operation', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [{ wireguard_tunnel_ip: null, api_password: 'secretpassword' }]
    } as any);

    await expect(service.createUser(1, 'user', 'default')).rejects.toThrow('Router 1 has no WireGuard tunnel IP — not provisioned yet');
  });

  it('should throw error when router has no api_password on REST operation', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [{ wireguard_tunnel_ip: '10.100.0.1', api_password: null }]
    } as any);

    await expect(service.createUser(1, 'user', 'default')).rejects.toThrow('Router 1 has no API credentials — provisioning incomplete');
  });

  it('should return isOnline: false when router is unprovisioned or unreachable', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [{ wireguard_tunnel_ip: null, api_password: null }]
    } as any);

    const status = await service.getRouterStatus(1);
    expect(status).toEqual({ isOnline: false });
  });

  it('should successfully load wireguard_tunnel_ip and api_password and authenticate REST call', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [{ wireguard_tunnel_ip: '10.100.0.1', api_password: 'secretpassword123' }]
    } as any);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ uptime: '2d3h', version: '7.12', 'architecture-name': 'arm64' })
    });
    global.fetch = mockFetch;

    const status = await service.getRouterStatus(1);

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT wireguard_tunnel_ip, api_password FROM routers WHERE id = $1',
      [1]
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'http://10.100.0.1/rest/system/resource',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Basic ' + Buffer.from('majal-api:secretpassword123').toString('base64'),
          'Content-Type': 'application/json'
        })
      })
    );

    expect(status).toEqual({
      isOnline: true,
      uptime: '2d3h',
      version: '7.12',
      architecture: 'arm64'
    });
  });

  it('should create user using REST PUT with loaded credentials and tunnel IP', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({
      rows: [{ wireguard_tunnel_ip: '10.100.0.2', api_password: 'mypassword456' }]
    } as any);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ret: '*1' })
    });
    global.fetch = mockFetch;

    const result = await service.createUser(2, 'voucher-user-1', 'default-profile');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://10.100.0.2/rest/ip/hotspot/user',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Authorization': 'Basic ' + Buffer.from('majal-api:mypassword456').toString('base64'),
        }),
        body: JSON.stringify({ name: 'voucher-user-1', password: 'voucher-user-1', profile: 'default-profile' })
      })
    );
    expect(result).toBe(true);
  });
});
