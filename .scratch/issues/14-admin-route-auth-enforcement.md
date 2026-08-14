# 14 — Enforce Authentication on All Admin Routes

**What to build:** Currently every admin-only endpoint (router registration, plan mutations, voucher disabling, audit log access, and more) is completely unauthenticated — any anonymous caller can hit them. Fix this so all admin routes reject unauthenticated requests with a `401 Unauthorized` response before any business logic runs.

The `getAdminId` helper already verifies the JWT and returns the admin's id or `null`. Right now its return value is only passed to the audit logger — the request proceeds regardless. The fix is to add a middleware (or a shared guard) that calls `getAdminId`, returns `401` when it gets `null`, and is applied to every route in the admin surface: at minimum `POST /api/routers`, `POST/PUT /api/plans`, `PUT /api/plans/:id/enable`, `PUT /api/plans/:id/disable`, `PUT /api/vouchers/:id/disable`, and `GET /api/audit-logs`. Public routes (`GET /api/plans`, `/api/checkout`, `/api/webhooks/paystack`, `/api/payments/:reference`, `/api/sessions`, and all provisioning endpoints) must remain open.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A request to any protected admin route with no `Authorization` header receives `401`
- [x] A request with an expired or malformed JWT receives `401`
- [x] A valid admin JWT allows the request through and the business logic executes normally
- [x] Public routes (`GET /api/plans`, checkout, webhook, sessions, provisioning) are unaffected and require no token
- [x] The audit log for any admin action records the correct admin id (not `null`)
- [x] New or updated integration tests cover the 401 path for at least two protected routes

f9a78CbDrQg40Udx
f9a78CbDrQg40Udx
