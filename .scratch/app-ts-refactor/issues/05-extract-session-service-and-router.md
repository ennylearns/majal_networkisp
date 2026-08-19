# 05 — Extract Hotspot Session Domain Service and Sub-Router

**What to build:** Encapsulation of active Wi-Fi connection tracking, live bandwidth streaming, and session termination into `HotspotSessionService` and `routes/sessions.ts`, coordinating with `MikroTikService` to query and disconnect sessions.

**Blocked by:** 01 — Foundational Domain Error Hierarchy and Route Middleware

**Status:** ready-for-agent

- [ ] `HotspotSessionService` encapsulates SQL queries for `hotspot_sessions` and live MikroTik session inspection
- [ ] `createSessionRouter` handles `/api/sessions` routes and disconnect commands
- [ ] Existing automated tests for session tracking pass without regression
