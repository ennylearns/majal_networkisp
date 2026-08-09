# 03 — Router provisioning execution, fleet status & walled garden

**What to build:** A physical router runs the generated Winbox command, downloads and imports a `.rsc` config that checks hardware architecture, RouterOS version, and internet connectivity before proceeding, then configures the hotspot bridge, ethernet ports, IP pool/address, DHCP, NAT masquerade, hotspot profile, walled garden, hotspot server, and WireGuard peer (with per-router configurable subnet/gateway/pool). The router then reports back as MAJAL-managed, and the admin can see its live status. The walled garden allows unauthenticated customers to reach the payment and login pages.

**Blocked by:** 02 — Router registration & provisioning tokens

**Status:** ready-for-agent

- [ ] `.rsc` provisioning template written/sourced, parameterized by subnet/gateway/pool range per router
- [ ] Provisioning script checks hardware architecture, RouterOS version, and internet connectivity before importing config, failing safely on incompatible hardware
- [ ] Provisioning configures: hotspot bridge, ethernet ports, IP pool, IP address, DHCP, NAT masquerade, hotspot profile, walled garden, hotspot server, WireGuard peer config
- [ ] Router reaches the central hub via a router-initiated WireGuard tunnel (required due to Starlink CGNAT) and reports back as MAJAL-managed
- [ ] `MikroTikService.provisionRouter` and `getRouterStatus` implemented against the RouterOS REST API over the WireGuard tunnel
- [ ] Admin can see each router's status (online/offline/provisioning/error), RouterOS version, architecture, location, and last-seen timestamp
- [ ] Dashboard shows online vs. offline router counts
- [ ] Walled garden verified to allow access to payment/login pages before hotspot authentication
- [ ] Provisioning results (including failures) are recorded against the router's provisioning token audit trail (from ticket 02)
