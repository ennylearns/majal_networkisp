# Service-Encapsulated SQL and Transaction Coordination

We encapsulate raw PostgreSQL queries directly within domain services rather than introducing an anemic repository layer or ORM. Multi-entity operations (such as purchasing a Plan, which touches Customer, Transaction, and Voucher records) are orchestrated by a coordinator service (`CheckoutService`) managing database transactions across an optional `client?: Pool | PoolClient` seam on domain write operations.

## Context

`backend/src/app.ts` previously embedded raw SQL queries directly inside Express route handlers, coupling HTTP routing with database queries and business logic across multiple domains.

## Decision

1. Domain services ([CustomerService](file:///backend/src/services/CustomerService.ts), [VoucherService](file:///backend/src/services/VoucherService.ts), [PlanService](file:///backend/src/services/PlanService.ts), [RouterService](file:///backend/src/services/RouterService.ts)) own their SQL queries internally via an injected `pg.Pool`.
2. Write methods on domain services accept an optional `client?: Pool | PoolClient` parameter (defaulting to the service's internal `pool`).
3. Multi-table transactional workflows are orchestrated by dedicated coordinator services (e.g. `CheckoutService`) which check out a `PoolClient`, issue `BEGIN`/`COMMIT`/`ROLLBACK`, and pass the client to participant services.
4. Route handlers delegate entirely to domain services and sub-routers, keeping Express controllers thin and database-agnostic.
