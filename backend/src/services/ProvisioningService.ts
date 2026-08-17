import crypto from 'crypto';
import { query } from '../db';

export interface ProvisioningCredentials {
  token: string;
  apiPassword: string;
  tunnelIp: string;
}

export class ProvisioningService {
  /**
   * Generates a unique, single-use, expiring provisioning token for a given router,
   * allocates a dynamic WireGuard tunnel IP (10.100.0.0/16), generates a 32-character hex API password,
   * updates the router record, and returns the credentials.
   */
  async generateToken(routerId: number): Promise<ProvisioningCredentials> {
    const token = crypto.randomBytes(32).toString('hex');
    const apiPassword = crypto.randomBytes(16).toString('hex');
    const tunnelIp = `10.100.${Math.floor(routerId / 256)}.${routerId % 256}`;
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // This handles upsert (since router_id is UNIQUE) if a previous token existed, 
    // we can either replace it or just insert a new one. In PostgreSQL we can use ON CONFLICT.
    const tokenSql = `
      INSERT INTO router_provisioning_tokens (token, router_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (router_id) 
      DO UPDATE SET 
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        used_at = NULL,
        revoked_at = NULL,
        provisioning_result = NULL
      RETURNING token
    `;
    
    const result = await query(tokenSql, [token, routerId, expiresAt]);

    const routerUpdateSql = `
      UPDATE routers 
      SET wireguard_tunnel_ip = $1, api_password = $2 
      WHERE id = $3
    `;
    await query(routerUpdateSql, [tunnelIp, apiPassword, routerId]);

    return {
      token: result.rows[0].token,
      apiPassword,
      tunnelIp,
    };
  }

  /**
   * Revokes a token by setting revoked_at timestamp.
   */
  async revokeToken(token: string): Promise<void> {
    const sql = `
      UPDATE router_provisioning_tokens 
      SET revoked_at = CURRENT_TIMESTAMP 
      WHERE token = $1
    `;
    const result = await query(sql, [token]);
    if (result.rowCount === 0) {
      throw new Error('Token not found');
    }
  }

  /**
   * Validates a token and marks it as used with the provisioning result.
   * Throws if invalid, expired, used, or revoked.
   * Returns the router_id.
   */
  async validateAndUseToken(token: string, resultMessage: string): Promise<number> {
    const checkSql = `
      SELECT id, router_id, expires_at, used_at, revoked_at 
      FROM router_provisioning_tokens 
      WHERE token = $1
    `;
    const checkResult = await query(checkSql, [token]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Token is invalid or expired');
    }
    
    const record = checkResult.rows[0];
    const now = new Date();
    
    if (record.used_at || record.revoked_at || new Date(record.expires_at) < now) {
      throw new Error('Token is invalid or expired');
    }

    const updateSql = `
      UPDATE router_provisioning_tokens 
      SET used_at = $1, provisioning_result = $2 
      WHERE id = $3
    `;
    await query(updateSql, [now, resultMessage, record.id]);

    return record.router_id;
  }
}
