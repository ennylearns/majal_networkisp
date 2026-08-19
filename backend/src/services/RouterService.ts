import { Pool, PoolClient } from 'pg';
import { NotFoundError, ValidationError } from '../errors';
import { ProvisioningService, ProvisioningCredentials } from './ProvisioningService';
import { AuditService } from './AuditService';
import { MikroTikService } from './MikroTikService';
import { generateRscScript } from './RscGenerator';

export interface RouterRecord {
  id: number;
  name: string;
  location: string | null;
  status: string;
  routeros_version: string | null;
  architecture: string | null;
  hotspot_subnet: string | null;
  hotspot_gateway: string | null;
  hotspot_pool_range: string | null;
  wireguard_peer_config: string | null;
  wireguard_public_key: string | null;
  wireguard_tunnel_ip: string | null;
  api_password: string | null;
  last_seen_at: string | Date | null;
  created_at?: string | Date;
}

export interface RouterSummary {
  id: number;
  name: string;
  location: string | null;
  status: string;
  routeros_version: string | null;
  architecture: string | null;
  last_seen_at: string | Date | null;
}

export interface CreateRouterDto {
  name: string;
  location?: string | null;
}

export interface RouterProvisioningResult {
  id: number;
  token: string;
  command: string;
  apiPassword: string;
  tunnelIp: string;
}

export interface RouterProvisionReportDto {
  token: string;
  status: 'success' | 'error' | string;
  message?: string;
}

export interface RouterDashboardStats {
  online_count: string | number;
  offline_count: string | number;
  provisioning_count: string | number;
  error_count: string | number;
}

export class RouterService {
  constructor(
    private pool: Pool,
    private provisioningService: ProvisioningService,
    private auditService?: AuditService,
    private mikroTikServiceResolver?: MikroTikService | (() => MikroTikService)
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

  private buildWinboxCommand(token: string, host: string = 'your-domain.com'): string {
    const protocol = 'https';
    const domain = host || 'your-domain.com';
    const url = `${protocol}://${domain}/provision/${token}`;
    return `/tool fetch url="${url}" mode=https dst-path=provision.rsc; /import file-name=provision.rsc`;
  }

  async findAll(client?: Pool | PoolClient): Promise<RouterSummary[]> {
    const db = this.getDb(client);
    const result = await db.query(`
      SELECT id, name, location, status, routeros_version, architecture, last_seen_at
      FROM routers
      ORDER BY id ASC
    `);
    return result.rows;
  }

  async findById(id: number, client?: Pool | PoolClient): Promise<RouterRecord | null> {
    const db = this.getDb(client);
    const result = await db.query('SELECT * FROM routers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getById(id: number, client?: Pool | PoolClient): Promise<RouterRecord> {
    const router = await this.findById(id, client);
    if (!router) {
      throw new NotFoundError('Router not found');
    }
    return router;
  }

  async create(
    data: CreateRouterDto,
    host: string = 'your-domain.com',
    adminId?: number | null,
    client?: Pool | PoolClient
  ): Promise<RouterProvisioningResult> {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('Router name is required');
    }

    const db = this.getDb(client);
    const result = await db.query(
      'INSERT INTO routers (name, location, status) VALUES ($1, $2, $3) RETURNING id',
      [data.name.trim(), data.location?.trim() || null, 'provisioning']
    );
    const routerId = result.rows[0].id;

    const { token, apiPassword, tunnelIp } = await this.provisioningService.generateToken(routerId);
    const command = this.buildWinboxCommand(token, host);

    if (this.auditService) {
      await this.auditService.logAction(
        adminId || null,
        'ROUTER_PROVISIONING_STARTED',
        'router',
        routerId,
        { token }
      );
    }

    return {
      id: routerId,
      token,
      apiPassword,
      tunnelIp,
      command,
    };
  }

  async generateProvisioningToken(
    routerId: number,
    host: string = 'your-domain.com',
    adminId?: number | null,
    client?: Pool | PoolClient
  ): Promise<RouterProvisioningResult> {
    await this.getById(routerId, client);

    const { token, apiPassword, tunnelIp } = await this.provisioningService.generateToken(routerId);
    const command = this.buildWinboxCommand(token, host);

    if (this.auditService) {
      await this.auditService.logAction(
        adminId || null,
        'ROUTER_PROVISIONING_TOKEN_GENERATED',
        'router',
        routerId,
        { token }
      );
    }

    return {
      id: routerId,
      token,
      apiPassword,
      tunnelIp,
      command,
    };
  }

  async generateRscScriptForRouter(
    routerId: number,
    host: string = 'api.majal.com',
    client?: Pool | PoolClient
  ): Promise<string> {
    const router = await this.getById(routerId, client);
    const db = this.getDb(client);

    const tokenResult = await db.query(
      'SELECT token FROM router_provisioning_tokens WHERE router_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [routerId]
    );
    const token = tokenResult.rows[0]?.token || 'unknown';

    const config = {
      routerId,
      token,
      hotspotSubnet: router.hotspot_subnet || '192.168.88.0/24',
      hotspotGateway: router.hotspot_gateway || '192.168.88.1',
      hotspotPoolRange: router.hotspot_pool_range || '192.168.88.10-192.168.88.254',
      wireguardPeerConfig: router.wireguard_peer_config || 'endpoint=wg.majal.com:51820',
      wireguardPublicKey: router.wireguard_public_key || 'dummy-public-key',
      apiPassword: router.api_password || '',
      wireguardTunnelIp: router.wireguard_tunnel_ip || '',
      reportUrl: `https://${host || 'api.majal.com'}/api/provision-report`,
    };

    return generateRscScript(config).trim();
  }

  async revokeToken(routerId: number, client?: Pool | PoolClient): Promise<void> {
    const db = this.getDb(client);
    const result = await db.query(
      'SELECT token FROM router_provisioning_tokens WHERE router_id = $1 AND revoked_at IS NULL AND used_at IS NULL',
      [routerId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('No active token found for this router');
    }

    await this.provisioningService.revokeToken(result.rows[0].token);
  }

  async fetchProvisioningScriptByToken(
    token: string,
    host: string = 'api.majal.com',
    client?: Pool | PoolClient
  ): Promise<string> {
    const routerId = await this.provisioningService.validateAndUseToken(token, 'Fetched provisioning script');
    const router = await this.getById(routerId, client);

    const config = {
      routerId,
      token,
      hotspotSubnet: router.hotspot_subnet || '192.168.88.0/24',
      hotspotGateway: router.hotspot_gateway || '192.168.88.1',
      hotspotPoolRange: router.hotspot_pool_range || '192.168.88.10-192.168.88.254',
      wireguardPeerConfig: router.wireguard_peer_config || 'endpoint=wg.majal.com:51820',
      wireguardPublicKey: router.wireguard_public_key || 'dummy-public-key',
      apiPassword: router.api_password || '',
      wireguardTunnelIp: router.wireguard_tunnel_ip || '',
      reportUrl: `https://${host || 'api.majal.com'}/api/provision-report`,
    };

    return generateRscScript(config).trim();
  }

  async handleProvisionReport(
    report: RouterProvisionReportDto,
    client?: Pool | PoolClient
  ): Promise<void> {
    if (!report.token || typeof report.token !== 'string' || report.token.trim() === '') {
      throw new ValidationError('Token required');
    }

    const db = this.getDb(client);
    const tokenResult = await db.query(
      'SELECT router_id FROM router_provisioning_tokens WHERE token = $1',
      [report.token]
    );
    const routerId = tokenResult.rows[0]?.router_id;

    await db.query(`
      UPDATE router_provisioning_tokens 
      SET provisioning_result = $1 
      WHERE token = $2
    `, [`${report.status}: ${report.message || ''}`, report.token]);

    if (routerId) {
      if (report.status === 'success') {
        await db.query(`
          UPDATE routers 
          SET status = 'online', last_seen_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [routerId]);

        if (this.auditService) {
          await this.auditService.logAction(null, 'ROUTER_PROVISIONED', 'router', routerId, {
            status: 'success',
            message: report.message,
          });
          await this.auditService.logAction(null, 'ROUTER_STATUS_CHANGED', 'router', routerId, {
            status: 'online',
          });
        }
      } else {
        await db.query(`
          UPDATE routers 
          SET status = 'error', last_seen_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [routerId]);

        if (this.auditService) {
          await this.auditService.logAction(null, 'ROUTER_PROVISIONING_FAILED', 'router', routerId, {
            status: 'error',
            message: report.message,
          });
          await this.auditService.logAction(null, 'ROUTER_STATUS_CHANGED', 'router', routerId, {
            status: 'error',
          });
        }
      }
    }
  }

  async getDashboardStats(client?: Pool | PoolClient): Promise<RouterDashboardStats> {
    const db = this.getDb(client);
    const result = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'online') as online_count,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_count,
        COUNT(*) FILTER (WHERE status = 'provisioning') as provisioning_count,
        COUNT(*) FILTER (WHERE status = 'error') as error_count
      FROM routers
    `);
    return result.rows[0];
  }

  async syncRouterStatus(routerId: number, client?: Pool | PoolClient): Promise<{ isOnline: boolean; uptime?: string }> {
    const mikroTik = this.getMikroTikService();
    if (!mikroTik) {
      return { isOnline: false };
    }

    const status = await mikroTik.getRouterStatus(routerId);
    const db = this.getDb(client);
    if (status.isOnline) {
      await db.query(
        "UPDATE routers SET status = 'online', last_seen_at = CURRENT_TIMESTAMP WHERE id = $1",
        [routerId]
      );
    } else {
      await db.query(
        "UPDATE routers SET status = 'offline' WHERE id = $1",
        [routerId]
      );
    }
    return status;
  }
}
