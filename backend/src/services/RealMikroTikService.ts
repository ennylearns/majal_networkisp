import { MikroTikService } from './MikroTikService';
import { pool } from '../db';

export class RealMikroTikService implements MikroTikService {
  private async getRouterIp(routerId: number): Promise<string> {
    const result = await pool.query('SELECT hotspot_gateway FROM routers WHERE id = $1', [routerId]);
    if (result.rows.length === 0) {
      throw new Error('Router not found');
    }
    // In a real scenario, this might be the WireGuard IP. For now, we assume gateway or a known WG IP.
    return result.rows[0].hotspot_gateway || '192.168.88.1';
  }

  private getAuthHeaders(): HeadersInit {
    // Basic auth or API token for RouterOS REST API
    return {
      'Authorization': 'Basic ' + Buffer.from('admin:').toString('base64'),
      'Content-Type': 'application/json'
    };
  }

  async createUser(routerId: number, username: string, profile: string): Promise<boolean> {
    // Implementation placeholder
    return true;
  }

  async deleteUser(routerId: number, username: string): Promise<boolean> {
    return true;
  }

  async disableUser(routerId: number, username: string): Promise<boolean> {
    return true;
  }

  async enableUser(routerId: number, username: string): Promise<boolean> {
    return true;
  }

  async createProfile(routerId: number, name: string, rateLimit: string, sessionDuration?: string, dataLimit?: string): Promise<boolean> {
    return true;
  }

  async getUsers(routerId: number): Promise<any[]> {
    return [];
  }

  async getActiveSessions(routerId: number): Promise<any[]> {
    return [];
  }

  async disconnectUser(routerId: number, username: string): Promise<boolean> {
    return true;
  }

  async getRouterStatus(routerId: number): Promise<{ isOnline: boolean; uptime?: string; version?: string; architecture?: string }> {
    try {
      const ip = await this.getRouterIp(routerId);
      // Calls the RouterOS REST API: /rest/system/resource
      const response = await fetch(`https://${ip}/rest/system/resource`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        return { isOnline: false };
      }
      
      const data = await response.json();
      return {
        isOnline: true,
        uptime: data.uptime,
        version: data.version,
        architecture: data['architecture-name']
      };
    } catch (error) {
      return { isOnline: false };
    }
  }

  async provisionRouter(token: string, routerConfig: any): Promise<boolean> {
    // Finalize provisioning over REST API if needed
    // In our flow, the .rsc script did most of it.
    // This could just verify the router is reachable and mark it as online.
    try {
      const ip = routerConfig.hotspotGateway || '192.168.88.1';
      const response = await fetch(`https://${ip}/rest/system/identity`, {
        headers: this.getAuthHeaders()
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
