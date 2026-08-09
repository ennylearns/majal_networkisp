# 12 — Admin action audit trail

**What to build:** Key administrative actions across the system — plan changes, voucher disabling, router provisioning, payments, and router status changes — are logged into a single, queryable audit trail, so the business has accountability and can debug issues after the fact.

**Blocked by:** 02 — Router registration & provisioning tokens, 03 — Router provisioning execution, fleet status & walled garden, 04 — Plan management, 06 — Payment checkout & webhook-verified transactions, 07 — Voucher generation & MikroTik activation, 11 — Admin voucher support & customer lookup

**Status:** ready-for-agent

- [ ] Audit log records: plan changes (create/enable/disable), voucher disabling, router provisioning events, payment events, router status changes
- [ ] Each audit entry records actor (admin), action type, target entity, timestamp, and relevant before/after or metadata
- [ ] Audit trail is queryable/viewable by an admin (filterable by action type, entity, or time range)
- [ ] Existing per-domain event logs (e.g. `router_events`, provisioning-token audit from ticket 02) are surfaced through or linked from this trail rather than duplicated
