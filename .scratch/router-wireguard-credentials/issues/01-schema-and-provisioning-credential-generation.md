# 01 — Schema & Provisioning Credential Generation

**What to build:** Add database columns for router WireGuard tunnel IP and API password, and update provisioning token generation to calculate a dynamic tunnel IP (`10.100.${Math.floor(routerId / 256)}.${routerId % 256}`), generate a 32-character hexadecimal API password, persist both to the `routers` table, and return `{ token, apiPassword, tunnelIp }`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `routers` table includes `wireguard_tunnel_ip VARCHAR(45)` and `api_password VARCHAR(255)` columns in schema
- [ ] `ProvisioningService.generateToken(routerId)` computes dynamic tunnel IP within `10.100.0.0/16`
- [ ] `ProvisioningService.generateToken(routerId)` generates a cryptographically random 32-character hex password
- [ ] `ProvisioningService.generateToken(routerId)` updates `routers` record with the new `wireguard_tunnel_ip` and `api_password`
- [ ] `ProvisioningService.generateToken(routerId)` returns `{ token, apiPassword, tunnelIp }`
- [ ] Unit and database integration tests verify credential generation and persistence
