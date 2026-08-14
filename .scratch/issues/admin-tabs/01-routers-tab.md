# 01 — Routers Tab

**What to build:** A "Routers" view in the admin portal that lists all routers and their connection statuses, and allows registering new routers or revoking provisioning tokens.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Sidebar "Routers" link navigates to the new Routers view (updating vanilla SPA routing as needed).
- [x] View fetches and displays routers in a table or grid from `GET /api/routers`.
- [x] Form to add a new router, sending `name` and `location` to `POST /api/routers`.
- [x] UI action on each router to revoke its provisioning token via `POST /api/routers/:id/revoke-token`.

## Answer
The issue has been implemented. The UI routing logic was updated to support switching between the dashboard and routers view. The router list uses `GET /api/routers` and renders status colors appropriately. An 'Add Router' modal handles submitting `POST /api/routers` and displays the resulting provisioning script command. The token revocation action triggers `POST /api/routers/:id/revoke-token` properly. All changes have been committed after a successful code review and full test pass.
