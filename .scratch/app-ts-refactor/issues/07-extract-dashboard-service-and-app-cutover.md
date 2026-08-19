# 07 — Extract Dashboard Summary Service and Final app.ts Cutover

**What to build:** Extraction of aggregated ISP analytics into `DashboardService` and `routes/dashboard.ts`, slimming `app.ts` down to a declarative ~50-line Express router mount and middleware pipeline, with complete test suite pass across all modules.

**Blocked by:** 05 — Extract Hotspot Session Domain Service and Sub-Router, 06 — Extract Transaction-Coordinated Checkout and Voucher Service

**Status:** ready-for-agent

- [ ] `DashboardService` encapsulates SQL queries for overview statistics, active sessions, and revenue metrics
- [ ] `createDashboardRouter` handles `/api/dashboard` endpoints with admin authorization
- [ ] `backend/src/app.ts` cleaned of all raw SQL and inline handlers, mounting sub-routers declaratively (~50 lines total)
- [ ] All unit, service, and API integration test suites run and pass 100%
