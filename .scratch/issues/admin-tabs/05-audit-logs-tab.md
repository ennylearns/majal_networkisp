# 05 — Audit Logs Tab

**What to build:** A dedicated "Audit Logs" view that expands on the dashboard snippet to show a full, searchable history of system events.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Sidebar "Audit Logs" link navigates to the Audit Logs view.
- [ ] View fetches data from `GET /api/audit-logs`.
- [ ] UI includes pagination and filtering controls (e.g., filtering by `actionType` or `targetEntity` using query params).
