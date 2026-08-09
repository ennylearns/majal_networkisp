# 04 — Plan management

**What to build:** An admin can create, edit, enable, and disable internet plans with name, price, data allowance, duration, download speed, and upload speed. Each plan maps to a MikroTik hotspot user profile so enforcement happens automatically at the network layer.

**Blocked by:** 01 — Backend & auth foundation

**Status:** closed

- [x] Admin can create a plan via `/api/plans` with name, price, data allowance, duration, download speed, upload speed
- [x] Admin can enable/disable a plan without deleting it, preserving historical records
- [x] Plan pricing and specs are fully configurable, not hardcoded
- [x] Each plan maps to a corresponding MikroTik hotspot user profile (rate limit, session duration, data limit) via `MikroTikService.createProfile`
- [x] Disabling a plan does not affect vouchers/transactions already issued against it

## Resolution

- **Plan Endpoints:** Added `POST /api/plans`, `PUT /api/plans/:id/enable`, `PUT /api/plans/:id/disable`, and `GET /api/plans` in `backend/src/app.ts`.
- **Profile Synchronization:** `POST /api/plans` queries all routers and synchronously pushes the `mikrotik_profile_name` using `MikroTikService.createProfile`.
- **MikroTikService update:** Extended the signature of `createProfile` to accept `sessionDuration` and `dataLimit`.
- **Tests:** Created `backend/tests/plans.test.ts` to assert creation, enable/disable toggle, and push to routers.
