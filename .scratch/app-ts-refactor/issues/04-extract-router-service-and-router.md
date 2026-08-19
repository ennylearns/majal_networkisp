# 04 — Extract Router Management Domain Service and Sub-Router

**What to build:** Encapsulation of physical MikroTik device registration, provisioning lifecycle, token validation, and status tracking into `RouterService` and `routes/routers.ts`, coordinating with `ProvisioningService` and `MikroTikService` without embedding SQL in route handlers.

**Blocked by:** 01 — Foundational Domain Error Hierarchy and Route Middleware

**Status:** completed

- [x] `RouterService` encapsulates SQL queries for `routers` and `router_provisioning_tokens`
- [x] Integrates with `ProvisioningService` and `MikroTikService` across clean interfaces
- [x] `createRouterRouter` handles `/api/routers` and provisioning endpoints with validation and error mapping
- [x] Existing automated tests for router registration and provisioning pass without regression
