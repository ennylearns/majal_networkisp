import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvisioningService } from '../src/services/ProvisioningService';
import * as db from '../src/db';

vi.mock('../src/db', () => ({
  query: vi.fn(),
  pool: {
    query: vi.fn(),
  },
}));

describe('ProvisioningService', () => {
  let service: ProvisioningService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProvisioningService();
  });

  describe('generateToken', () => {
    it('should generate token, dynamic tunnel IP, random 32-char hex API password, update router, and return credentials', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ token: 'abc-123' }] } as any) // insert into router_provisioning_tokens
        .mockResolvedValueOnce({ rowCount: 1 } as any); // update routers

      const creds = await service.generateToken(1);

      expect(creds).toEqual({
        token: 'abc-123',
        apiPassword: expect.stringMatching(/^[0-9a-f]{32}$/),
        tunnelIp: '10.100.0.1',
      });

      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO router_provisioning_tokens'),
        expect.arrayContaining([expect.any(String), 1, expect.any(Date)])
      );

      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE routers'),
        ['10.100.0.1', creds.apiPassword, 1]
      );
    });

    it('should calculate dynamic tunnel IP correctly across subnet boundaries', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ token: 'token-256' }] } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const creds256 = await service.generateToken(256);
      expect(creds256.tunnelIp).toBe('10.100.1.0');

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ token: 'token-515' }] } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const creds515 = await service.generateToken(515);
      expect(creds515.tunnelIp).toBe('10.100.2.3');
    });

    it('should generate distinct API passwords on subsequent token generation', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ token: 'tok-1' }] } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ token: 'tok-2' }] } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const first = await service.generateToken(1);
      const second = await service.generateToken(1);

      expect(first.apiPassword).not.toBe(second.apiPassword);
      expect(first.apiPassword).toHaveLength(32);
      expect(second.apiPassword).toHaveLength(32);
    });
  });

  describe('revokeToken', () => {
    it('should update the revoked_at timestamp', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 } as any);
      
      await service.revokeToken('abc-123');
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE router_provisioning_tokens'),
        ['abc-123']
      );
    });

    it('should throw if token not found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 0 } as any);
      
      await expect(service.revokeToken('not-found')).rejects.toThrow('Token not found');
    });
  });

  describe('validateAndUseToken', () => {
    it('should throw if token is expired', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 1, router_id: 1, expires_at: pastDate, used_at: null, revoked_at: null }]
      } as any);

      await expect(service.validateAndUseToken('expired-token', 'success')).rejects.toThrow('Token is invalid or expired');
    });

    it('should throw if token is already used', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 1, router_id: 1, expires_at: futureDate, used_at: new Date(), revoked_at: null }]
      } as any);

      await expect(service.validateAndUseToken('used-token', 'success')).rejects.toThrow('Token is invalid or expired');
    });

    it('should throw if token is revoked', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 1, router_id: 1, expires_at: futureDate, used_at: null, revoked_at: new Date() }]
      } as any);

      await expect(service.validateAndUseToken('revoked-token', 'success')).rejects.toThrow('Token is invalid or expired');
    });

    it('should update used_at and result on success', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 1, router_id: 2, expires_at: futureDate, used_at: null, revoked_at: null }]
      } as any);

      const routerId = await service.validateAndUseToken('valid-token', 'Provisioning successful');
      
      expect(routerId).toBe(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE router_provisioning_tokens'),
        [expect.any(Date), 'Provisioning successful', 1]
      );
    });
  });
});
