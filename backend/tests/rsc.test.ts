import { describe, it, expect } from 'vitest';
import { generateRscScript } from '../src/services/RscGenerator';

describe('RscGenerator', () => {
  it('should generate script with correct parameters including API user and WireGuard tunnel IP', () => {
    const script = generateRscScript({
      routerId: 5,
      hotspotSubnet: '10.0.0.0/24',
      hotspotGateway: '10.0.0.1',
      hotspotPoolRange: '10.0.0.10-10.0.0.250',
      wireguardPeerConfig: 'endpoint=1.2.3.4:51820',
      wireguardPublicKey: 'pubkey123',
      apiPassword: 'a1b2c3d4e5f67890a1b2c3d4e5f67890',
      wireguardTunnelIp: '10.100.0.5',
      token: 'test-token',
      reportUrl: 'https://test.com/report'
    });

    expect(script).toContain(':if ($arch != "arm" and $arch != "arm64") do={');
    expect(script).toContain('https://test.com/report');
    expect(script).toContain('test-token');
    expect(script).toContain(':if ($rosVerNum < 7) do={');
    expect(script).toContain('/interface bridge add name=hotspot-bridge');
    expect(script).toContain('address=10.0.0.1/24');
    expect(script).toContain('ranges=10.0.0.10-10.0.0.250');
    expect(script).toContain('/ip hotspot profile');
    expect(script).toContain('/ip hotspot walled-garden');
    expect(script).toContain('/interface wireguard add listen-port=51820 name=wireguard1');
    expect(script).toContain('/interface wireguard peers add interface=wireguard1 public-key="pubkey123" endpoint=1.2.3.4:51820');
    expect(script).toContain('/ip address add address=10.100.0.5/24 interface=wireguard1');
    expect(script).toContain('/user add name=majal-api password="a1b2c3d4e5f67890a1b2c3d4e5f67890" group=full');
    expect(script).toContain('/ip service set www address=10.100.0.0/16 disabled=no');
    expect(script).toContain('/ip service set www-ssl disabled=yes');
  });
});

