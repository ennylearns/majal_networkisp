import { describe, it, expect, vi } from 'vitest';
import { generateRscScript } from '../src/services/RscGenerator';

describe('RscGenerator', () => {
  it('should generate script with correct parameters', () => {
    const script = generateRscScript({
      routerId: 5,
      hotspotSubnet: '10.0.0.0/24',
      hotspotGateway: '10.0.0.1',
      hotspotPoolRange: '10.0.0.10-10.0.0.250',
      wireguardPeerConfig: 'endpoint=1.2.3.4:51820',
      wireguardPublicKey: 'pubkey123',
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
    expect(script).toContain('endpoint=1.2.3.4:51820');
    expect(script).toContain('public-key="pubkey123"');
  });
});
