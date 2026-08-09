# 08 — Payment status polling & voucher delivery

**What to build:** After a customer completes payment on Paystack, the captive portal learns the outcome and shows the voucher — without ever trusting the client-side Paystack callback as proof of payment. The webhook (ticket 06) remains the source of truth; the frontend callback only triggers polling. The portal reflects both payment status and voucher activation status, with a bounded wait and a graceful fallback if activation is still retrying.

**Blocked by:** 06 — Payment checkout & webhook-verified transactions, 07 — Voucher generation & MikroTik activation

**Status:** ready-for-agent

- [ ] `GET /api/payments/:reference` status endpoint returns current `transactions.status` and, once available, the associated voucher's `activation_status`
- [ ] Paystack's client-side callback (on the captive portal) is used only to start polling `/api/payments/:reference` — never treated as confirmation of payment
- [ ] Portal polls at a short interval (e.g. every 2–3s) until `transactions.status` is `SUCCESSFUL` and voucher `activation_status` is `ACTIVATED`, then displays the plaintext voucher code (the one-time display per ticket 07)
- [ ] Polling has a bounded timeout (e.g. 60–90s); on timeout, portal shows a "payment received, activation in progress" message rather than hanging indefinitely or implying failure
- [ ] If the webhook hasn't updated the transaction after a threshold, the status endpoint falls back to calling `PaymentService.verifyTransaction` directly against Paystack as a reconciliation backstop, rather than waiting indefinitely on the webhook alone
- [ ] Status endpoint behavior is tested against the fake `PaymentService`/`MikroTikService`, covering: immediate success, delayed webhook (backstop verify path), and stuck/failed activation (timeout message path)
