import { Pool, PoolClient } from 'pg';
import { MikroTikService } from './MikroTikService';
import { AuditService } from './AuditService';
import { NotFoundError, ValidationError } from '../errors';

export interface Plan {
  id: number;
  name: string;
  price: string | number;
  data_allowance: string | number | null;
  duration: number | null;
  download_speed: string | null;
  upload_speed: string | null;
  mikrotik_profile_name: string;
  enabled: boolean;
  created_at?: string | Date;
}

export interface CreatePlanDto {
  name: string;
  price: number | string;
  data_allowance?: number | string | null;
  duration?: number | null;
  download_speed?: string | null;
  upload_speed?: string | null;
  mikrotik_profile_name?: string;
  enabled?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  price?: number | string;
  data_allowance?: number | string | null;
  duration?: number | null;
  download_speed?: string | null;
  upload_speed?: string | null;
  mikrotik_profile_name?: string;
  enabled?: boolean;
}

export interface PortalPlan {
  id: number;
  name: string;
  price: string | number;
  mikrotik_profile_name: string;
  enabled: boolean;
  created_at?: string | Date;
  data_limit_bytes: number | null;
  duration_minutes: number | null;
  speed_down_kbps: number | null;
  speed_up_kbps: number | null;
}

/** Parse MikroTik speed strings like "10M", "512k", "1G" to kbps integers. */
export function parseSpeedToKbps(speed: string | null | undefined): number | null {
  if (speed == null || speed === '') return null;
  const match = speed.trim().match(/^(\d+(?:\.\d+)?)\s*([kKmMgG]?)(?:bps)?$/i);
  if (!match || !match[1]) return null;
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'g') return Math.round(value * 1_000_000);
  if (unit === 'm') return Math.round(value * 1_000);
  if (unit === 'k') return Math.round(value);
  return Math.round(value / 1000); // assume bps → kbps
}

/** Map a raw DB plan row to the shape the captive portal frontend expects. */
export function normalizePlanForPortal(row: Record<string, any>): PortalPlan {
  const { data_allowance, duration, download_speed, upload_speed, ...rest } = row;
  return {
    ...rest,
    id: row.id,
    name: row.name,
    price: row.price,
    mikrotik_profile_name: row.mikrotik_profile_name,
    enabled: row.enabled,
    created_at: row.created_at,
    data_limit_bytes: data_allowance != null ? Number(data_allowance) : null,
    duration_minutes: duration != null ? Number(duration) * 24 * 60 : null,
    speed_down_kbps: parseSpeedToKbps(download_speed),
    speed_up_kbps: parseSpeedToKbps(upload_speed),
  };
}

export class PlanService {
  constructor(
    private pool: Pool,
    private mikroTikServiceResolver?: MikroTikService | (() => MikroTikService),
    private auditService?: AuditService
  ) {}

  private getMikroTikService(): MikroTikService | undefined {
    if (typeof this.mikroTikServiceResolver === 'function') {
      return this.mikroTikServiceResolver();
    }
    return this.mikroTikServiceResolver;
  }

  private getDb(client?: Pool | PoolClient): Pool | PoolClient {
    return client || this.pool;
  }

  async findAll(client?: Pool | PoolClient): Promise<Plan[]> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM plans ORDER BY id ASC');
    return result.rows;
  }

  async findActive(client?: Pool | PoolClient): Promise<Plan[]> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM plans WHERE enabled = true ORDER BY id ASC');
    return result.rows;
  }

  async findById(id: number, client?: Pool | PoolClient): Promise<Plan | null> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM plans WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getById(id: number, client?: Pool | PoolClient): Promise<Plan> {
    const plan = await this.findById(id, client);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    return plan;
  }

  async create(data: CreatePlanDto, adminId?: number | null, client?: Pool | PoolClient): Promise<Plan> {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('Plan name is required');
    }
    if (data.price === undefined || data.price === null || isNaN(Number(data.price)) || Number(data.price) < 0) {
      throw new ValidationError('Valid plan price is required');
    }

    const mikrotik_profile_name = data.mikrotik_profile_name || data.name.replace(/\s+/g, '_');
    const enabled = data.enabled !== undefined ? data.enabled : true;
    const db = this.getDb(client);

    const result = await db.query(`
      INSERT INTO plans (name, price, data_allowance, duration, download_speed, upload_speed, mikrotik_profile_name, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.name,
      data.price,
      data.data_allowance ?? null,
      data.duration ?? null,
      data.download_speed ?? null,
      data.upload_speed ?? null,
      mikrotik_profile_name,
      enabled
    ]);

    const plan = result.rows[0];

    // Push profile to all routers
    try {
      const routersResult = await db.query(`SELECT id FROM routers`);
      const routers = routersResult.rows;

      const rateLimit = `${data.upload_speed || '0'}/${data.download_speed || '0'}`;
      const sessionDuration = data.duration ? `${data.duration}d` : undefined;
      const dataLimit = data.data_allowance ? data.data_allowance.toString() : undefined;

      const mikroTik = this.getMikroTikService();
      if (mikroTik) {
        for (const router of routers) {
          try {
            await mikroTik.createProfile(router.id, mikrotik_profile_name, rateLimit, sessionDuration, dataLimit);
          } catch (err) {
            console.error(`Failed to push profile to router ${router.id}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to query routers for profile sync:', err);
    }

    if (this.auditService) {
      await this.auditService.logAction(adminId ?? null, 'PLAN_CREATED', 'plan', plan.id, {
        name: data.name,
        price: data.price
      });
    }

    return plan;
  }

  async update(id: number, data: UpdatePlanDto, adminId?: number | null, client?: Pool | PoolClient): Promise<Plan> {
    const existing = await this.getById(id, client);
    const db = this.getDb(client);

    const name = data.name !== undefined ? data.name : existing.name;
    const price = data.price !== undefined ? data.price : existing.price;
    const data_allowance = data.data_allowance !== undefined ? data.data_allowance : existing.data_allowance;
    const duration = data.duration !== undefined ? data.duration : existing.duration;
    const download_speed = data.download_speed !== undefined ? data.download_speed : existing.download_speed;
    const upload_speed = data.upload_speed !== undefined ? data.upload_speed : existing.upload_speed;
    const mikrotik_profile_name = data.mikrotik_profile_name !== undefined ? data.mikrotik_profile_name : existing.mikrotik_profile_name;
    const enabled = data.enabled !== undefined ? data.enabled : existing.enabled;

    const result = await db.query(`
      UPDATE plans
      SET name = $1, price = $2, data_allowance = $3, duration = $4, download_speed = $5, upload_speed = $6, mikrotik_profile_name = $7, enabled = $8
      WHERE id = $9
      RETURNING *
    `, [name, price, data_allowance, duration, download_speed, upload_speed, mikrotik_profile_name, enabled, id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Plan not found');
    }

    if (this.auditService) {
      await this.auditService.logAction(adminId ?? null, 'PLAN_UPDATED', 'plan', id, { ...data });
    }

    return result.rows[0];
  }

  async enable(id: number, adminId?: number | null, client?: Pool | PoolClient): Promise<Plan> {
    const db = this.getDb(client);
    const result = await db.query('UPDATE plans SET enabled = true WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Plan not found');
    }
    if (this.auditService) {
      await this.auditService.logAction(adminId ?? null, 'PLAN_ENABLED', 'plan', id);
    }
    return result.rows[0];
  }

  async disable(id: number, adminId?: number | null, client?: Pool | PoolClient): Promise<Plan> {
    const db = this.getDb(client);
    const result = await db.query('UPDATE plans SET enabled = false WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Plan not found');
    }
    if (this.auditService) {
      await this.auditService.logAction(adminId ?? null, 'PLAN_DISABLED', 'plan', id);
    }
    return result.rows[0];
  }

  async delete(id: number, adminId?: number | null, client?: Pool | PoolClient): Promise<Plan> {
    const db = this.getDb(client);
    const result = await db.query('DELETE FROM plans WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Plan not found');
    }
    if (this.auditService) {
      await this.auditService.logAction(adminId ?? null, 'PLAN_DELETED', 'plan', id);
    }
    return result.rows[0];
  }
}
