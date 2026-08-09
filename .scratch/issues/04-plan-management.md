# 04 — Plan management

**What to build:** An admin can create, edit, enable, and disable internet plans with name, price, data allowance, duration, download speed, and upload speed. Each plan maps to a MikroTik hotspot user profile so enforcement happens automatically at the network layer.

**Blocked by:** 01 — Backend & auth foundation

**Status:** ready-for-agent

- [ ] Admin can create a plan via `/api/plans` with name, price, data allowance, duration, download speed, upload speed
- [ ] Admin can enable/disable a plan without deleting it, preserving historical records
- [ ] Plan pricing and specs are fully configurable, not hardcoded
- [ ] Each plan maps to a corresponding MikroTik hotspot user profile (rate limit, session duration, data limit) via `MikroTikService.createProfile`
- [ ] Disabling a plan does not affect vouchers/transactions already issued against it
