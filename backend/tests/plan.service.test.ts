import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';
import { PlanService, normalizePlanForPortal, parseSpeedToKbps } from '../src/services/PlanService';
import { FakeMikroTikService } from '../src/services/MikroTikService';
import { AuditService } from '../src/services/AuditService';
import { NotFoundError, ValidationError } from '../src/errors';

describe('PlanService Unit Tests', () => {
  let mockPool: any;
  let fakeMikroTik: FakeMikroTikService;
  let auditService: AuditService;
  let planService: PlanService;
  let auditLogSpy: any;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
    fakeMikroTik = new FakeMikroTikService();
    auditService = new AuditService(mockPool as any);
    auditLogSpy = vi.spyOn(auditService, 'logAction').mockResolvedValue();

    planService = new PlanService(
      mockPool as unknown as Pool,
      () => fakeMikroTik,
      auditService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll and findActive', () => {
    it('returns all plans from database', async () => {
      const fakePlans = [
        { id: 1, name: 'Plan 1', price: '100', enabled: true },
        { id: 2, name: 'Plan 2', price: '200', enabled: false },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: fakePlans });

      const result = await planService.findAll();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM plans ORDER BY id ASC');
      expect(result).toEqual(fakePlans);
    });

    it('returns only active plans when findActive is called', async () => {
      const activePlans = [{ id: 1, name: 'Plan 1', price: '100', enabled: true }];
      mockPool.query.mockResolvedValueOnce({ rows: activePlans });

      const result = await planService.findActive();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM plans WHERE enabled = true ORDER BY id ASC');
      expect(result).toEqual(activePlans);
    });
  });

  describe('findById and getById', () => {
    it('returns plan when found', async () => {
      const plan = { id: 1, name: 'Plan 1', price: '100', enabled: true };
      mockPool.query.mockResolvedValueOnce({ rows: [plan] });

      const result = await planService.findById(1);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM plans WHERE id = $1', [1]);
      expect(result).toEqual(plan);
    });

    it('returns null when plan is not found with findById', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await planService.findById(999);
      expect(result).toBeNull();
    });

    it('throws NotFoundError when getById cannot find plan', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(planService.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('validates required name and price', async () => {
      await expect(planService.create({ name: '', price: 100 })).rejects.toThrow(ValidationError);
      await expect(planService.create({ name: 'Valid', price: -5 })).rejects.toThrow(ValidationError);
    });

    it('creates a plan, pushes profile to routers, and logs audit', async () => {
      const createdRow = {
        id: 10,
        name: 'Super Speed',
        price: '2500.00',
        data_allowance: '10000000000',
        duration: 30,
        download_speed: '20M',
        upload_speed: '10M',
        mikrotik_profile_name: 'Super_Speed',
        enabled: true,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [createdRow] }) // INSERT INTO plans
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }); // SELECT id FROM routers

      const createProfileSpy = vi.spyOn(fakeMikroTik, 'createProfile');

      const plan = await planService.create({
        name: 'Super Speed',
        price: 2500,
        data_allowance: 10000000000,
        duration: 30,
        download_speed: '20M',
        upload_speed: '10M',
      }, 42);

      expect(plan).toEqual(createdRow);
      expect(createProfileSpy).toHaveBeenCalledTimes(2);
      expect(createProfileSpy).toHaveBeenCalledWith(1, 'Super_Speed', '10M/20M', '30d', '10000000000');
      expect(createProfileSpy).toHaveBeenCalledWith(2, 'Super_Speed', '10M/20M', '30d', '10000000000');
      expect(auditLogSpy).toHaveBeenCalledWith(42, 'PLAN_CREATED', 'plan', 10, { name: 'Super Speed', price: 2500 });
    });

    it('tolerates router communication failures during profile push without failing plan creation', async () => {
      const createdRow = { id: 10, name: 'Basic', price: '10.00', mikrotik_profile_name: 'Basic', enabled: true };
      mockPool.query
        .mockResolvedValueOnce({ rows: [createdRow] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      vi.spyOn(fakeMikroTik, 'createProfile').mockRejectedValueOnce(new Error('Router unreachable'));

      const plan = await planService.create({ name: 'Basic', price: 10 }, 1);
      expect(plan).toEqual(createdRow);
    });
  });

  describe('enable and disable', () => {
    it('enables plan and writes audit log', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, enabled: true }] });

      const plan = await planService.enable(1, 42);
      expect(mockPool.query).toHaveBeenCalledWith('UPDATE plans SET enabled = true WHERE id = $1 RETURNING *', [1]);
      expect(plan.enabled).toBe(true);
      expect(auditLogSpy).toHaveBeenCalledWith(42, 'PLAN_ENABLED', 'plan', 1);
    });

    it('throws NotFoundError when enabling non-existent plan', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(planService.enable(999, 42)).rejects.toThrow(NotFoundError);
    });

    it('disables plan and writes audit log', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, enabled: false }] });

      const plan = await planService.disable(1, 42);
      expect(mockPool.query).toHaveBeenCalledWith('UPDATE plans SET enabled = false WHERE id = $1 RETURNING *', [1]);
      expect(plan.enabled).toBe(false);
      expect(auditLogSpy).toHaveBeenCalledWith(42, 'PLAN_DISABLED', 'plan', 1);
    });

    it('throws NotFoundError when disabling non-existent plan', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(planService.disable(999, 42)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update and delete', () => {
    it('updates plan fields and writes audit log', async () => {
      const existing = { id: 1, name: 'Old Name', price: 100, enabled: true };
      mockPool.query
        .mockResolvedValueOnce({ rows: [existing] }) // getById
        .mockResolvedValueOnce({ rows: [{ ...existing, name: 'New Name' }] }); // UPDATE

      const updated = await planService.update(1, { name: 'New Name' }, 42);
      expect(updated.name).toBe('New Name');
      expect(auditLogSpy).toHaveBeenCalledWith(42, 'PLAN_UPDATED', 'plan', 1, { name: 'New Name' });
    });

    it('deletes plan and writes audit log', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'To Delete' }] });

      const deleted = await planService.delete(1, 42);
      expect(deleted.id).toBe(1);
      expect(auditLogSpy).toHaveBeenCalledWith(42, 'PLAN_DELETED', 'plan', 1);
    });

    it('throws NotFoundError when deleting non-existent plan', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(planService.delete(999, 42)).rejects.toThrow(NotFoundError);
    });
  });

  describe('Portal Normalization and Speed Parsing', () => {
    it('correctly parses speed strings to kbps', () => {
      expect(parseSpeedToKbps(null)).toBeNull();
      expect(parseSpeedToKbps('')).toBeNull();
      expect(parseSpeedToKbps('10M')).toBe(10000);
      expect(parseSpeedToKbps('20Mbps')).toBe(20000);
      expect(parseSpeedToKbps('512k')).toBe(512);
      expect(parseSpeedToKbps('1G')).toBe(1000000);
      expect(parseSpeedToKbps('500000bps')).toBe(500);
    });

    it('normalizes DB plan shape for captive portal', () => {
      const row = {
        id: 1,
        name: 'Weekly Pro',
        price: '1000.00',
        data_allowance: '53687091200',
        duration: 7,
        download_speed: '20M',
        upload_speed: '10M',
        mikrotik_profile_name: 'Weekly_Pro',
        enabled: true,
      };

      const normalized = normalizePlanForPortal(row);
      expect(normalized.data_limit_bytes).toBe(53687091200);
      expect(normalized.duration_minutes).toBe(7 * 24 * 60);
      expect(normalized.speed_down_kbps).toBe(20000);
      expect(normalized.speed_up_kbps).toBe(10000);
      expect(normalized).not.toHaveProperty('data_allowance');
      expect(normalized).not.toHaveProperty('duration');
      expect(normalized).not.toHaveProperty('download_speed');
      expect(normalized).not.toHaveProperty('upload_speed');
    });
  });
});
