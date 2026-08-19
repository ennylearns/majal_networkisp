# 06 — Extract Transaction-Coordinated Checkout and Voucher Service

**What to build:** Atomically coordinated plan purchase workflow (`CheckoutService`) managing database transactions across customer registration, transaction logging, and voucher generation, followed by non-blocking MikroTik router sync with `router_sync_status = 'PENDING'` fallback.

**Blocked by:** 02 — Extract Plan Domain Service and Sub-Router, 03 — Extract Customer Domain Service and Sub-Router, 04 — Extract Router Management Domain Service and Sub-Router

**Status:** ready-for-agent

- [ ] `CheckoutService` orchestrates `BEGIN ... COMMIT` across `CustomerService`, `TransactionService`, and `VoucherService` using checked-out `PoolClient`
- [ ] MikroTik router sync runs post-commit; on router failure/timeout, sets `router_sync_status = 'PENDING'` without failing customer voucher delivery
- [ ] `createPurchaseRouter` and `createVoucherRouter` handle `/api/purchase` and `/api/vouchers` endpoints
- [ ] Existing automated purchase and voucher tests pass without regression
