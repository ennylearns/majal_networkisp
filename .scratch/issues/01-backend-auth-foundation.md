# 01 — Backend & auth foundation

**What to build:** A runnable Node.js/TypeScript backend (Express or Fastify) with the core database schema skeleton in place, and admin login/authentication working end-to-end. Establish the `MikroTikService` and `PaymentService` interfaces as defined seams, each backed by a fake/test-double implementation from day one, since nearly every later module depends on one or both.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Backend project scaffolded (Node/TS, Express or Fastify), connects to PostgreSQL
- [ ] Core schema created: `admins`, `routers`, `router_provisioning_tokens`, `plans`, `customers`, `vouchers`, `transactions`, `sessions`, `router_events`, `portal_settings`
- [ ] Admin can authenticate (login) against `/api/auth`
- [ ] `MikroTikService` interface defined (`createUser`, `deleteUser`, `disableUser`, `enableUser`, `createProfile`, `getUsers`, `getActiveSessions`, `disconnectUser`, `getRouterStatus`, `provisionRouter`), no live router calls yet
- [ ] Fake `MikroTikService` implementation exists, simulating success, timeout, and unreachable-router conditions
- [ ] `PaymentService` interface defined (`initialize`, `verifyWebhook`, `verifyTransaction`)
- [ ] Fake `PaymentService` implementation exists, simulating known-good and tampered webhook payloads
- [ ] A smoke test exercises both fakes and confirms the seams are wired into the app, not just standalone modules
