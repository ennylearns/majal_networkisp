# 15 — Thread Router ID From Captive Portal Through Checkout to Voucher Activation

**What to build:** When a customer buys WiFi, their MikroTik hotspot user must be created on the same router they are physically connected to. Right now the voucher activation picks an arbitrary online router, which means a customer at Site A could end up with an account on Site B's MikroTik and can never log in.

The MikroTik hotspot injects query parameters into the captive portal URL (typically `mac`, `ip`, `username`, `link-login`, `link-login-only`, `link-orig`, and — via a custom redirect configuration — a `router_id` or equivalent site identifier). The fix threads that identifier across every hop:

1. **Portal URL → checkout request:** The captive portal reads the router identifier from the URL query string and includes it in the body of the `POST /api/checkout` call.
2. **Checkout → transaction:** `POST /api/checkout` accepts `routerId` (or equivalent), validates it exists and is online, and stores it on the transaction record (requires a `router_id` column on `transactions`).
3. **Transaction → voucher:** When a voucher is issued for a transaction, it inherits the transaction's `router_id` instead of querying for any available router.
4. **Voucher → MikroTik activation:** The activation uses the voucher's `router_id` to call `mikroTikService.createUser` on the correct router.

If the router is offline at activation time the voucher should be set to `FAILED` (current behaviour), not silently moved to another router.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The captive portal reads a router identifier from its URL params and sends it with the checkout request
- [ ] `POST /api/checkout` validates the supplied `routerId` and returns `400` if it is missing or unknown
- [ ] The `transactions` table has a `router_id` column that is populated at checkout time
- [ ] Voucher issuance uses `transaction.router_id` — the arbitrary-router fallback query is removed
- [ ] MikroTik user creation targets the voucher's `router_id`, not any random online router
- [ ] A customer whose router is offline at activation time gets a `FAILED` voucher (no silent re-routing to another site)
- [ ] End-to-end integration test verifies that a checkout on Router A results in a MikroTik user on Router A, not Router B
