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
    it('should generate a unique token and store it', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [{ token: 'abc-123' }] } as any);
      
      const token = await service.generateToken(1);
      
      expect(token).toBe('abc-123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO router_provisioning_tokens'),
        expect.arrayContaining([1, expect.any(String), expect.any(Date)])
      );
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
