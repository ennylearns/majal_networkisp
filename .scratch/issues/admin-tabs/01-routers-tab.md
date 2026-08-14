# 01 — Routers Tab

**What to build:** A "Routers" view in the admin portal that lists all routers and their connection statuses, and allows registering new routers or revoking provisioning tokens.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Sidebar "Routers" link navigates to the new Routers view (updating vanilla SPA routing as needed).
- [ ] View fetches and displays routers in a table or grid from `GET /api/routers`.
- [ ] Form to add a new router, sending `name` and `location` to `POST /api/routers`.
- [ ] UI action on each router to revoke its provisioning token via `POST /api/routers/:id/revoke-token`.
