# 03 — End-to-End Router Provisioning & REST API Route Integration

**What to build:** Integrate the updated provisioning credentials and script generation into backend route handlers (`POST /api/routers/:id/provision-token`, `GET /api/routers/:id/provision.rsc`) so provisioned routers can authenticate immediately with `RealMikroTikService`.

**Blocked by:** 02 — RouterOS Script (`.rsc`) Generation with WireGuard IP & API User

**Status:** done

- [x] `POST /api/routers/:id/provision-token` route handler returns the token and generated credential metadata
- [x] `GET /api/routers/:id/provision.rsc` retrieves stored router `wireguard_tunnel_ip` and `api_password` and passes them to `generateRscScript`
- [x] `RealMikroTikService` successfully loads `wireguard_tunnel_ip` and `api_password` from database for provisioned routers
- [x] All route and provisioning integration tests pass (`tests/provisioning.test.ts`, `tests/fleet.test.ts`, etc.)
