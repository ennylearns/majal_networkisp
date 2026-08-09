export interface RouterConfig {
  routerId: number;
  hotspotSubnet: string;
  hotspotGateway: string;
  hotspotPoolRange: string;
  wireguardPeerConfig: string;
  wireguardPublicKey: string;
  token?: string;
  reportUrl?: string;
}

export function generateRscScript(config: RouterConfig): string {
  // Extracting subnet base without CIDR for IP address assignment if needed, 
  // but usually gateway + CIDR is used for address
  const gatewayAddress = `${config.hotspotGateway}/24`; // assuming /24 for simplicity if not in hotspotGateway
  const token = config.token || 'unknown';
  const reportUrl = config.reportUrl || 'https://api.majal.com/api/provision-report';

  return `# MAJAL Router Provisioning Script

:global arch [/system resource get architecture-name];
:global rosVer [/system resource get version];
:global rosVerNum [:pick $rosVer 0 [:find $rosVer "."]];

# 1. Check Hardware & RouterOS version
:if ($arch != "arm" and $arch != "arm64") do={
    :log error "Hardware architecture $arch not supported. Must be arm or arm64.";
    /tool fetch url="${reportUrl}" mode=https http-method=post http-header-field="Content-Type: application/json" http-data="{\\"token\\":\\"${token}\\",\\"status\\":\\"error\\",\\"message\\":\\"Incompatible hardware architecture\\"}" keep-result=no;
    :error "Incompatible hardware.";
}
:if ($rosVerNum < 7) do={
    :log error "RouterOS version $rosVer is not supported. Must be v7+.";
    /tool fetch url="${reportUrl}" mode=https http-method=post http-header-field="Content-Type: application/json" http-data="{\\"token\\":\\"${token}\\",\\"status\\":\\"error\\",\\"message\\":\\"Incompatible RouterOS version\\"}" keep-result=no;
    :error "Incompatible RouterOS version.";
}

# 2. Check Internet Connectivity
:if ([:len [/ping 8.8.8.8 count=2]] = 0) do={
    :log error "No internet connectivity.";
    /tool fetch url="${reportUrl}" mode=https http-method=post http-header-field="Content-Type: application/json" http-data="{\\"token\\":\\"${token}\\",\\"status\\":\\"error\\",\\"message\\":\\"No internet connectivity\\"}" keep-result=no;
    :error "No internet connectivity.";
}

# 3. Configure Hotspot Bridge & Ethernet ports
/interface bridge add name=hotspot-bridge
/interface bridge port add bridge=hotspot-bridge interface=ether2
/interface bridge port add bridge=hotspot-bridge interface=ether3
/interface bridge port add bridge=hotspot-bridge interface=ether4
/interface bridge port add bridge=hotspot-bridge interface=ether5

# 4. IP Pool, Address, DHCP
/ip pool add name=hotspot-pool ranges=${config.hotspotPoolRange}
/ip address add address=${gatewayAddress} interface=hotspot-bridge network=${config.hotspotSubnet}
/ip dhcp-server add address-pool=hotspot-pool interface=hotspot-bridge name=hotspot-dhcp disabled=no
/ip dhcp-server network add address=${config.hotspotSubnet} gateway=${config.hotspotGateway}

# 5. NAT Masquerade
/ip firewall nat add action=masquerade chain=srcnat out-interface=ether1

# 6. Hotspot Profile, Server, Walled Garden
/ip hotspot profile add hotspot-address=${config.hotspotGateway} login-by=http-chap,http-pap name=hsprof1 use-radius=yes
/ip hotspot add interface=hotspot-bridge name=hotspot1 profile=hsprof1 disabled=no
# Walled garden for payment and login pages
/ip hotspot walled-garden add dst-host="*majal.com" action=allow
/ip hotspot walled-garden add dst-host="*paystack.com" action=allow

# 7. WireGuard Peer
/interface wireguard add listen-port=51820 name=wireguard1
/interface wireguard peers add interface=wireguard1 public-key="${config.wireguardPublicKey}" ${config.wireguardPeerConfig}

/system identity set name="MAJAL-Router-${config.routerId}"
/log info "Provisioning complete for MAJAL network"
/tool fetch url="${reportUrl}" mode=https http-method=post http-header-field="Content-Type: application/json" http-data="{\\"token\\":\\"${token}\\",\\"status\\":\\"success\\",\\"message\\":\\"Provisioned successfully\\"}" keep-result=no;
`;
}
