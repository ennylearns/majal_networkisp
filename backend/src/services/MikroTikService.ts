export interface MikroTikService {
  createUser(routerId: number, username: string, profile: string): Promise<boolean>;
  deleteUser(routerId: number, username: string): Promise<boolean>;
  disableUser(routerId: number, username: string): Promise<boolean>;
  enableUser(routerId: number, username: string): Promise<boolean>;
  createProfile(routerId: number, name: string, rateLimit: string): Promise<boolean>;
  getUsers(routerId: number): Promise<any[]>;
  getActiveSessions(routerId: number): Promise<any[]>;
  disconnectUser(routerId: number, username: string): Promise<boolean>;
  getRouterStatus(routerId: number): Promise<{ isOnline: boolean; uptime?: string }>;
  provisionRouter(token: string, routerConfig: any): Promise<boolean>;
}

export type FakeMikroTikCondition = 'success' | 'timeout' | 'unreachable';

export class FakeMikroTikService implements MikroTikService {
  private condition: FakeMikroTikCondition = 'success';
  private simulatedDelayMs: number = 0;

  setCondition(condition: FakeMikroTikCondition, delayMs: number = 0) {
    this.condition = condition;
    this.simulatedDelayMs = delayMs;
  }

  private async simulateNetworkCall(): Promise<void> {
    if (this.simulatedDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.simulatedDelayMs));
    }
    if (this.condition === 'timeout') {
      throw new Error('Connection timeout to router');
    }
    if (this.condition === 'unreachable') {
      throw new Error('Router is unreachable');
    }
  }

  async createUser(routerId: number, username: string, profile: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async deleteUser(routerId: number, username: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async disableUser(routerId: number, username: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async enableUser(routerId: number, username: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async createProfile(routerId: number, name: string, rateLimit: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async getUsers(routerId: number): Promise<any[]> {
    await this.simulateNetworkCall();
    return [{ username: 'testuser', profile: 'default' }];
  }

  async getActiveSessions(routerId: number): Promise<any[]> {
    await this.simulateNetworkCall();
    return [{ username: 'testuser', ip: '192.168.88.10' }];
  }

  async disconnectUser(routerId: number, username: string): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }

  async getRouterStatus(routerId: number): Promise<{ isOnline: boolean; uptime?: string }> {
    if (this.condition === 'unreachable' || this.condition === 'timeout') {
      return { isOnline: false };
    }
    await this.simulateNetworkCall();
    return { isOnline: true, uptime: '10d' };
  }

  async provisionRouter(token: string, routerConfig: any): Promise<boolean> {
    await this.simulateNetworkCall();
    return true;
  }
}
