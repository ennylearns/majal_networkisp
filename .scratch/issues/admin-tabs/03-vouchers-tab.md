# 03 — Vouchers Tab

**What to build:** A "Vouchers" view in the admin portal to monitor and manage issued network access vouchers.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Sidebar "Vouchers" link navigates to the Vouchers view.
- [ ] View fetches and displays vouchers from `GET /api/vouchers`.
- [ ] Search functionality to filter vouchers by phone number or email (utilizing query parameters on the endpoint).
- [ ] Action button to manually revoke network access by calling `PUT /api/vouchers/:id/disable`.
