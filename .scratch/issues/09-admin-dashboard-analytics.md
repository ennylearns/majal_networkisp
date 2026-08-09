# 09 — Admin dashboard & analytics

**What to build:** A real-time admin dashboard showing a business snapshot (today's revenue, active customers, active sessions, total customers, total vouchers, online/offline router counts), a live view of active sessions across all routers, and revenue/plan-level sales analytics.

**Blocked by:** 07 — Voucher generation & MikroTik activation, 03 — Router provisioning execution, fleet status & walled garden

**Status:** ready-for-agent

- [ ] Dashboard shows today's revenue, active customers, active sessions, total customers, total vouchers, and online/offline router counts
- [ ] Admin can see currently active sessions across all routers (username, router, plan, data used, IP/MAC where available) via `getActiveSessions`
- [ ] Revenue breakdown by today/week/month and by plan/router
- [ ] Plan-level sales analytics (units sold, revenue per plan)
