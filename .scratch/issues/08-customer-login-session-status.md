# 08 — Customer login & session status

**What to build:** A customer logs into the hotspot using their voucher code (used as both username and password) and can see their remaining data/time/session status.

**Blocked by:** 07 — Voucher generation & MikroTik activation

**Status:** ready-for-agent

- [ ] Customer can log in at the captive portal using the voucher code as both username and password
- [ ] Login validates the voucher against MikroTik hotspot auth (via `MikroTikService`) and the voucher's lifecycle status
- [ ] Customer can view remaining data/time and current session status via an API-backed view (`/api/sessions`)
- [ ] Expired/exhausted/disabled vouchers are rejected at login with a clear customer-facing message
