import { MikroTikService } from './MikroTikService';
import { pool } from '../db';

interface RouterConnection {
  ip: string;
  username: string;
  password: string;
}

export class RealMikroTikService implements MikroTikService {
  private async getRouterConnection(routerId: number): Promise<RouterConnection> {
    const result = await pool.query(
      'SELECT wireguard_tunnel_ip, api_password FROM routers WHERE id = $1',
      [routerId]
    );
    if (result.rows.length === 0) {
      throw new Error(`Router ${routerId} not found`);
    }
    const row = result.rows[0];
    if (!row.wireguard_tunnel_ip) {
      throw new Error(`Router ${routerId} has no WireGuard tunnel IP — not provisioned yet`);
    }
    if (!row.api_password) {
      throw new Error(`Router ${routerId} has no API credentials — provisioning incomplete`);
    }
    return { ip: row.wireguard_tunnel_ip, username: 'majal-api', password: row.api_password };
  }

  private getAuthHeaders(conn: RouterConnection): HeadersInit {
    return {
      'Authorization': 'Basic ' + Buffer.from(`${conn.username}:${conn.password}`).toString('base64'),
      'Content-Type': 'application/json'
    };
  }

  /** Thin wrapper over RouterOS REST: GET=print, PUT=add, PATCH=set, DELETE=remove */
  private async restCall(routerId: number, path: string, options: { method?: string; body?: any } = {}): Promise<any> {
    const conn = await this.getRouterConnection(routerId);
    const url = `http://${conn.ip}${path}`; // plain HTTP: traffic never leaves the WireGuard tunnel

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getAuthHeaders(conn),
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal
      });
    } catch (err) {
      throw new Error(`Router ${routerId} unreachable at ${conn.ip}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`RouterOS REST ${options.method || 'GET'} ${path} on router ${routerId} failed: ${response.status} ${text}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /** Find a hotspot user's internal .id by username. Returns null if not found. */
  private async findHotspotUserId(routerId: number, username: string): Promise<string | null> {
    const rows = await this.restCall(routerId, `/rest/ip/hotspot/user?name=${encodeURIComponent(username)}`);
    return Array.isArray(rows) && rows.length > 0 ? rows[0]['.id'] : null;
  }

  private async findActiveSessionId(routerId: number, username: string): Promise<string | null> {
    const rows = await this.restCall(routerId, `/rest/ip/hotspot/active?user=${encodeURIComponent(username)}`);
    return Array.isArray(rows) && rows.length > 0 ? rows[0]['.id'] : null;
  }

  async createUser(routerId: number, username: string, profile: string): Promise<boolean> {
    await this.restCall(routerId, '/rest/ip/hotspot/user', {
      method: 'PUT',
      body: { name: username, password: username, profile }
    });
    return true;
  }

  async deleteUser(routerId: number, username: string): Promise<boolean> {
    const id = await this.findHotspotUserId(routerId, username);
    if (!id) return false;
    await this.restCall(routerId, `/rest/ip/hotspot/user/${id}`, { method: 'DELETE' });
    return true;
  }

  async disableUser(routerId: number, username: string): Promise<boolean> {
    const id = await this.findHotspotUserId(routerId, username);
    if (!id) return false;
    await this.restCall(routerId, `/rest/ip/hotspot/user/${id}`, {
      method: 'PATCH',
      body: { disabled: 'true' }
    });
    // Also kick any live session so disabling takes effect immediately
    const activeId = await this.findActiveSessionId(routerId, username);
    if (activeId) {
      await this.restCall(routerId, `/rest/ip/hotspot/active/${activeId}`, { method: 'DELETE' });
    }
    return true;
  }

  async enableUser(routerId: number, username: string): Promise<boolean> {
    const id = await this.findHotspotUserId(routerId, username);
    if (!id) return false;
    await this.restCall(routerId, `/rest/ip/hotspot/user/${id}`, {
      method: 'PATCH',
      body: { disabled: 'false' }
    });
    return true;
  }

  async createProfile(routerId: number, name: string, rateLimit: string, sessionDuration?: string, dataLimit?: string): Promise<boolean> {
    // NOTE: RouterOS hotspot user *profiles* don't carry an absolute data cap —
    // that lives on the individual /ip hotspot user via "limit-bytes-total".
    // dataLimit is accepted here for interface parity but must also be applied
    // per-user at createUser time if/when data caps are needed (tracked separately).
    const existing = await this.restCall(routerId, `/rest/ip/hotspot/user/profile?name=${encodeURIComponent(name)}`);
    const body: Record<string, any> = { name, 'rate-limit': rateLimit };
    if (sessionDuration) body['session-timeout'] = sessionDuration;

    if (Array.isArray(existing) && existing.length > 0) {
      await this.restCall(routerId, `/rest/ip/hotspot/user/profile/${existing[0]['.id']}`, {
        method: 'PATCH',
        body
      });
    } else {
      await this.restCall(routerId, '/rest/ip/hotspot/user/profile', { method: 'PUT', body });
    }
    return true;
  }

  async getUsers(routerId: number): Promise<any[]> {
    const rows = await this.restCall(routerId, '/rest/ip/hotspot/user');
    return Array.isArray(rows) ? rows : [];
  }

  async getActiveSessions(routerId: number): Promise<any[]> {
    const rows = await this.restCall(routerId, '/rest/ip/hotspot/active');
    if (!Array.isArray(rows)) return [];
    return rows.map(r => ({
      username: r.user,
      ip: r.address,
      mac: r['mac-address'],
      uptime: r.uptime,
      bytesIn: r['bytes-in'],
      bytesOut: r['bytes-out']
    }));
  }

  async disconnectUser(routerId: number, username: string): Promise<boolean> {
    const id = await this.findActiveSessionId(routerId, username);
    if (!id) return false;
    await this.restCall(routerId, `/rest/ip/hotspot/active/${id}`, { method: 'DELETE' });
    return true;
  }

  async getRouterStatus(routerId: number): Promise<{ isOnline: boolean; uptime?: string; version?: string; architecture?: string }> {
    try {
      const data = await this.restCall(routerId, '/rest/system/resource');
      return {
        isOnline: true,
        uptime: data?.uptime,
        version: data?.version,
        architecture: data?.['architecture-name']
      };
    } catch {
      return { isOnline: false };
    }
  }

  async provisionRouter(token: string, routerConfig: any): Promise<boolean> {
    // Real provisioning happens via the .rsc import flow (/provision/:token).
    // This just confirms the router is now reachable over the tunnel post-import.
    try {
      const status = await this.getRouterStatus(routerConfig.routerId);
      return status.isOnline;
    } catch {
      return false;
    }
  }
}