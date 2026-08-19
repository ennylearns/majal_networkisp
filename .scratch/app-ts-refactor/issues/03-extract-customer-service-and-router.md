# 03 — Extract Customer Domain Service and Sub-Router

**What to build:** Encapsulation of customer identity, contact lookup, and purchase history into `CustomerService` and `routes/customers.ts`, allowing admins to list customers, view specific customer profiles with linked transactions, and find or register customers during checkout.

**Blocked by:** 01 — Foundational Domain Error Hierarchy and Route Middleware

**Status:** ready-for-agent

- [ ] `CustomerService` encapsulates SQL queries for `customers` table with optional `client?: Pool | PoolClient` seam on write methods
- [ ] `createCustomerRouter` factory handles `/api/customers` endpoints with admin authentication
- [ ] Existing automated tests for customer queries pass without regression
