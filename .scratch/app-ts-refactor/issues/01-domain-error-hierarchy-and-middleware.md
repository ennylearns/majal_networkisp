# 01 — Foundational Domain Error Hierarchy and Route Middleware

**What to build:** Standardized domain error classes and Express error middleware so that backend failures return uniform JSON error bodies with accurate HTTP status codes (400, 401, 404, 409, 502) across all routes without manual try/catch formatting.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Domain error classes defined: `DomainError`, `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `BadGatewayError`
- [ ] Central Express error middleware translates domain errors to appropriate HTTP status codes and uniform JSON response shape `{ error: message }`
- [ ] Unknown / unhandled internal exceptions are logged and mapped to HTTP 500
- [ ] Auth middleware (`requireAdmin`) extracted to dedicated module
