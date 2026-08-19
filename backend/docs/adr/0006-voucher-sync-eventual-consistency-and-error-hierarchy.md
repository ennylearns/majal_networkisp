# Voucher Router Sync Eventual Consistency and Error Hierarchy

We treat MikroTik router synchronization during voucher purchase as eventually consistent (`router_sync_status = 'PENDING'`), returning the issued voucher to the customer immediately without rolling back payment if router communication fails. Domain operations communicate failure via structured domain error classes mapped to HTTP responses by central middleware.

## Context

When a customer purchases a plan via Paystack, the backend persists the transaction and creates a voucher in PostgreSQL before pushing the credential to the physical MikroTik router via RouterOS REST API. Physical routers can experience transient network outages or latency.

## Decision

1. **Non-Blocking Router Sync**: If immediate sync to the MikroTik router fails, the voucher is marked with `router_sync_status = 'PENDING'` and the purchase succeeds. Background reconciliation syncs pending vouchers when the router reconnects.
2. **Semantic Domain Errors**: Services throw typed domain errors (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`) rather than generic `Error` strings. Central Express error middleware maps these errors to HTTP status codes (404, 400, 409, 401).
3. **Route Factory Functions**: Sub-routers are constructed via factory functions receiving domain service instances (e.g. `createPlanRouter(planService)`), enabling dependency injection in tests.
