import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { RouterService } from '../src/services/RouterService';
import { ProvisioningService } from '../src/services/ProvisioningService';
import { AuditService } from '../src/services/AuditService';
import { NotFoundError, ValidationError } from '../src/errors';
import { FakeMikroTikService } from '../src/services/MikroTikService';

describe('RouterService', () => {
  let pool: Pool;
  let provisioningService: ProvisioningService;
  let auditService: AuditService;
  let mikroTikService: FakeMikroTikService;
  let routerService: RouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = {
      query: vi.fn(),
    } as unknown as Pool;
    provisioningService = new ProvisioningService();
    auditService = new AuditService(pool);
    mikroTikService = new FakeMikroTikService();
    routerService = new RouterService(pool, provisioningService, auditService, () => mikroTikService);
  });

  describe('findAll', () => {
    it('returns all routers ordered by id', async () => {
      const mockRouters = [
        { id: 1, name: 'Router 1', status: 'online' },
        { id: 2, name: 'Router 2', status: 'offline' },
      ];
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: mockRouters } as any);

      const routers = await routerService.findAll();
      expect(routers).toEqual(mockRouters);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name, location, status'));
    });
  });

  describe('findById / getById', () => {
    it('findById returns router record if found', async () => {
      const mockRouter = { id: 1, name: 'Router 1', status: 'online' };
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [mockRouter] } as any);

      const router = await routerService.findById(1);
      expect(router).toEqual(mockRouter);
    });

    it('findById returns null if router not found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      const router = await routerService.findById(999);
      expect(router).toBeNull();
    });

    it('getById returns router record if found', async () => {
      const mockRouter = { id: 1, name: 'Router 1', status: 'online' };
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [mockRouter] } as any);

      const router = await routerService.getById(1);
      expect(router).toEqual(mockRouter);
    });

    it('getById throws NotFoundError if router not found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      await expect(routerService.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('throws ValidationError if name is empty', async () => {
      await expect(routerService.create({ name: '   ' })).rejects.toThrow(ValidationError);
    });

    it('creates router in provisioning status, generates token, logs audit, and returns credentials', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ id: 42 }] } as any) // insert router
        .mockResolvedValueOnce({ rowCount: 1 } as any); // audit log
      vi.spyOn(provisioningService, 'generateToken').mockResolvedValueOnce({
        token: 'tok-42',
        apiPassword: 'secretpassword42',
        tunnelIp: '10.100.0.42',
      });
      vi.spyOn(auditService, 'logAction').mockResolvedValueOnce({} as any);

      const result = await routerService.create({ name: 'Router Alpha', location: 'Lobby' }, 'api.majal.com', 1);

      expect(result).toEqual({
        id: 42,
        token: 'tok-42',
        apiPassword: 'secretpassword42',
        tunnelIp: '10.100.0.42',
        command: expect.stringContaining('/provision/tok-42'),
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO routers'),
        ['Router Alpha', 'Lobby', 'provisioning']
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        1,
        'ROUTER_PROVISIONING_STARTED',
        'router',
        42,
        { token: 'tok-42' }
      );
    });
  });

  describe('generateProvisioningToken', () => {
    it('throws NotFoundError if router does not exist', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      await expect(routerService.generateProvisioningToken(999)).rejects.toThrow(NotFoundError);
    });

    it('generates new token, logs audit, and returns metadata', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Core Router' }] } as any); // getById
      vi.spyOn(provisioningService, 'generateToken').mockResolvedValueOnce({
        token: 'new-tok-5',
        apiPassword: 'pass5',
        tunnelIp: '10.100.0.5',
      });
      vi.spyOn(auditService, 'logAction').mockResolvedValueOnce({} as any);

      const result = await routerService.generateProvisioningToken(5, 'api.majal.com', 1);

      expect(result).toEqual({
        id: 5,
        token: 'new-tok-5',
        apiPassword: 'pass5',
        tunnelIp: '10.100.0.5',
        command: expect.stringContaining('/provision/new-tok-5'),
      });
      expect(auditService.logAction).toHaveBeenCalledWith(
        1,
        'ROUTER_PROVISIONING_TOKEN_GENERATED',
        'router',
        5,
        { token: 'new-tok-5' }
      );
    });
  });

  describe('generateRscScriptForRouter', () => {
    it('throws NotFoundError if router does not exist', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      await expect(routerService.generateRscScriptForRouter(999)).rejects.toThrow(NotFoundError);
    });

    it('generates script with active token and router parameters', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            name: 'Router 7',
            wireguard_tunnel_ip: '10.100.0.7',
            api_password: 'pass7',
          }]
        } as any) // getById
        .mockResolvedValueOnce({
          rows: [{ token: 'active-tok-7' }]
        } as any); // token query

      const script = await routerService.generateRscScriptForRouter(7, 'api.majal.com');
      expect(script).toContain('10.100.0.7');
      expect(script).toContain('pass7');
    });
  });

  describe('revokeToken', () => {
    it('throws NotFoundError if no active token found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as any);

      await expect(routerService.revokeToken(10)).rejects.toThrow(NotFoundError);
    });

    it('revokes active token via ProvisioningService', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ token: 'tok-10' }] } as any);
      vi.spyOn(provisioningService, 'revokeToken').mockResolvedValueOnce();

      await routerService.revokeToken(10);
      expect(provisioningService.revokeToken).toHaveBeenCalledWith('tok-10');
    });
  });

  describe('fetchProvisioningScriptByToken', () => {
    it('validates token and generates RSC script', async () => {
      vi.spyOn(provisioningService, 'validateAndUseToken').mockResolvedValueOnce(10);
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{
          id: 10,
          wireguard_tunnel_ip: '10.100.0.10',
          api_password: 'pass10',
        }]
      } as any); // getById

      const script = await routerService.fetchProvisioningScriptByToken('tok-10', 'api.majal.com');
      expect(script).toContain('10.100.0.10');
      expect(script).toContain('pass10');
    });
  });

  describe('handleProvisionReport', () => {
    it('throws ValidationError if token is missing', async () => {
      await expect(routerService.handleProvisionReport({ token: '', status: 'success' })).rejects.toThrow(ValidationError);
    });

    it('handles success report: updates token, sets router online, and logs audit', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ router_id: 12 }] } as any) // token lookup
        .mockResolvedValueOnce({ rowCount: 1 } as any) // token update
        .mockResolvedValueOnce({ rowCount: 1 } as any); // router update
      vi.spyOn(auditService, 'logAction').mockResolvedValue({} as any);

      await routerService.handleProvisionReport({
        token: 'tok-12',
        status: 'success',
        message: 'All interfaces configured',
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE routers"),
        [12]
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'online'"),
        [12]
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        null,
        'ROUTER_PROVISIONED',
        'router',
        12,
        { status: 'success', message: 'All interfaces configured' }
      );
    });

    it('handles error report: updates token, sets router error, and logs audit', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [{ router_id: 12 }] } as any) // token lookup
        .mockResolvedValueOnce({ rowCount: 1 } as any) // token update
        .mockResolvedValueOnce({ rowCount: 1 } as any); // router update
      vi.spyOn(auditService, 'logAction').mockResolvedValue({} as any);

      await routerService.handleProvisionReport({
        token: 'tok-12',
        status: 'error',
        message: 'Interface wlan1 not found',
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE routers"),
        [12]
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'error'"),
        [12]
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        null,
        'ROUTER_PROVISIONING_FAILED',
        'router',
        12,
        { status: 'error', message: 'Interface wlan1 not found' }
      );
    });
  });

  describe('getDashboardStats', () => {
    it('returns router status counts', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{
          online_count: '2',
          offline_count: '1',
          provisioning_count: '0',
          error_count: '0',
        }]
      } as any);

      const stats = await routerService.getDashboardStats();
      expect(stats).toEqual({
        online_count: '2',
        offline_count: '1',
        provisioning_count: '0',
        error_count: '0',
      });
    });
  });
});
