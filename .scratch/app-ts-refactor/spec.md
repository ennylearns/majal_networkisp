# Spec: Backend API Modularization and Domain Service Extraction

**Status:** ready-for-agent

## Problem Statement

The central HTTP routing entrypoint (`backend/src/app.ts`) has grown into an 890+ line monolith. It directly embeds raw SQL database queries, business rules, multi-table transactions, authentication middleware, and hardware communication with MikroTik routers inside Express route handlers. This tight coupling makes testing difficult, obscures domain boundaries, and risks data inconsistency when multi-step operations fail midway.

## Solution

Decompose the monolithic HTTP server into deep, cohesive domain modules with encapsulated persistence, explicit error types, and clean seams:
- Encapsulate database access directly inside dedicated domain services (`PlanService`, `CustomerService`, `RouterService`, `HotspotSessionService`, `DashboardService`) with an injected connection pool.
- Coordinate multi-entity transactional workflows (such as plan purchasing and voucher issuance) via a coordinator service (`CheckoutService`) across an optional transaction client seam.
- Decouple routing into modular sub-router factory functions mounted on a minimal, declarative Express application.
- Standardize domain errors across all modules, mapped by central error middleware into uniform HTTP status codes and responses.

## User Stories

1. As an ISP Administrator, I want to create, update, and list commercial Plans with defined prices, bandwidth, and validity limits, so that customers have package options.
2. As an ISP Administrator, I want to toggle the active status of Plans, so that obsolete packages are hidden from the captive portal.
3. As an ISP Administrator, I want to register physical MikroTik Routers and generate 24-hour single-use provisioning tokens, so that routers can automatically bootstrap themselves onto the WireGuard network.
4. As an ISP Administrator, I want to view the real-time lifecycle status of Routers, so that I can monitor offline or misconfigured devices.
5. As an ISP Administrator, I want to search and inspect Customers along with their linked Transactions and Vouchers, so that I can resolve billing and support inquiries.
6. As an ISP Administrator, I want to view aggregated Dashboard metrics (active routers, active sessions, total revenue, recent transactions), so that I can understand overall network performance.
7. As an ISP Administrator, I want all route handlers to enforce admin authentication, so that unauthorized users cannot alter ISP configuration or view sensitive customer data.
8. As a Captive Portal Guest, I want to view active Plans, so that I can select an internet package to purchase.
9. As a Captive Portal Guest, I want to purchase a Plan via Paystack, so that I receive an active Voucher code for Wi-Fi authentication.
10. As a Captive Portal Guest, I want my purchase to succeed and deliver my Voucher code even if the physical Router experiences a temporary communication glitch, so that my payment is never lost.
11. As a Captive Portal Guest, I want to check my active Hotspot Session bandwidth and time usage, so that I know how much quota remains.
12. As a Backend Developer, I want domain services to encapsulate their own SQL queries, so that database implementation details do not leak into HTTP route controllers.
13. As a Backend Developer, I want multi-step write operations to support transaction coordination via an optional client seam, so that database records remain atomic without leaking database connections into routes.
14. As a Backend Developer, I want domain services to throw typed domain errors (NotFoundError, ValidationError, ConflictError), so that error translation to HTTP status codes is centralized and uniform.
15. As a Backend Developer, I want sub-routers to be instantiated via factory functions, so that unit and integration tests can inject stubs and mocks without running a live database.

## Implementation Decisions

1. **Service-Encapsulated SQL (ADR 0001)**:
   Domain services encapsulate raw SQL queries internally via an injected PostgreSQL connection pool. No anemic repository or ORM abstraction layer is introduced.
2. **Transaction Coordination via Client Seam (ADR 0001)**:
   Domain write methods accept an optional database client (`client?: Pool | PoolClient`), defaulting to the service's internal pool. Coordinator services (`CheckoutService`) check out a dedicated client, issue `BEGIN`/`COMMIT`/`ROLLBACK`, and pass the client to participant services to guarantee ACID atomicity across Customer, Transaction, and Voucher creation.
3. **Eventual Consistency on Router Sync (ADR 0002)**:
   When a Voucher is purchased, the database transaction is committed first. The subsequent synchronization call to the MikroTik Router is non-blocking on failure: if the Router is unreachable, the voucher's sync status is set to `PENDING` and returned to the customer, allowing background reconciliation to complete synchronization.
4. **Typed Domain Error Hierarchy (ADR 0002)**:
   Domain services throw semantic domain exceptions (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `BadGatewayError`). A centralized Express error middleware translates these into HTTP responses (404, 400, 409, 401, 502) and JSON bodies of `{ error: message }`.
5. **Router Factory Functions**:
   Sub-routes are created via factory functions accepting domain service dependencies (e.g. `createPlanRouter(planService)`), keeping route handlers thin (validating input, calling service, returning JSON).
6. **Declarative Entrypoint**:
   The main server setup file is reduced to configuring global middleware, instantiating services, and mounting sub-routers.

## Testing Decisions

- **Seam Selection**: Testing will primarily target the HTTP route layer (using supertest / test HTTP client with real or stubbed service dependencies) and direct public service interfaces.
- **Behavioral Focus**: Tests assert observable external behavior (HTTP status codes, response payload shapes, database state transitions, and error messages) rather than internal query execution details.
- **Transaction & Error Tests**: Explicit test cases will verify database rollback when checkout steps fail and proper HTTP 400/404/409 mapping when domain errors are thrown.
- **Prior Art**: Follows existing service test conventions in `backend/tests/`.

## Out of Scope

- Introducing an ORM (e.g. Prisma or TypeORM) or query builder.
- Rewriting the Captive Portal or ISP Admin frontend clients.
- Modifying the underlying PostgreSQL schema or database table names.
- Adding asynchronous message queues (e.g. RabbitMQ/Redis) for background jobs.

## Further Notes

- Execution will follow the 7 published tickets in `.scratch/app-ts-refactor/issues/`.
- All domain terminology strictly aligns with `CONTEXT-MAP.md` and `backend/CONTEXT.md`.
