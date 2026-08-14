# 02 — Plans Tab

**What to build:** A "Plans" view in the admin portal to manage internet data plans and their speed/data limits.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Sidebar "Plans" link navigates to the Plans view.
- [ ] View fetches and displays existing plans from `GET /api/plans`.
- [ ] Form to create a new plan, submitting details to `POST /api/plans`.
- [ ] Controls for each plan to toggle its status using `PUT /api/plans/:id/enable` and `PUT /api/plans/:id/disable`.
