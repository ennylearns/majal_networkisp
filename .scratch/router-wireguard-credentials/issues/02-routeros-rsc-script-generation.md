# 02 — RouterOS Script (`.rsc`) Generation with WireGuard IP & API User

**What to build:** Update the RouterOS `.rsc` configuration script generator to create the `majal-api` user with full privileges, enable and restrict the `www` service to `10.100.0.0/16`, disable `www-ssl`, and assign the allocated tunnel IP address to interface `wireguard1`.

**Blocked by:** 01 — Schema & Provisioning Credential Generation

**Status:** ready-for-agent

- [ ] `RouterConfig` interface requires `apiPassword` and `wireguardTunnelIp`
- [ ] `generateRscScript` includes `/user add name=majal-api password="<apiPassword>" group=full`
- [ ] `generateRscScript` includes `/ip service set www address=10.100.0.0/16 disabled=no`
- [ ] `generateRscScript` includes `/ip service set www-ssl disabled=yes`
- [ ] `generateRscScript` includes `/ip address add address=<wireguardTunnelIp>/24 interface=wireguard1`
- [ ] Test suite in `tests/rsc.test.ts` asserts all new script commands and parameters
