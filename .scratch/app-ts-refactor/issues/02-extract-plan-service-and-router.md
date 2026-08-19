# 02 — Extract Plan Domain Service and Sub-Router

**What to build:** Full encapsulation of internet package catalog and pricing management into `PlanService` and `routes/plans.ts`, allowing admins and portal guests to list, inspect, create, update, and toggle active status of commercial plans with SQL queries completely removed from `app.ts`.

**Blocked by:** 01 — Foundational Domain Error Hierarchy and Route Middleware

**Status:** ready-for-agent

- [ ] `PlanService` encapsulates all SQL queries for `plans` table (`findAll`, `findActive`, `findById`, `create`, `update`, `delete`)
- [ ] `createPlanRouter` factory handles `/api/plans` routing and validates request parameters using domain errors
- [ ] Existing automated tests for plans endpoints pass without regression
