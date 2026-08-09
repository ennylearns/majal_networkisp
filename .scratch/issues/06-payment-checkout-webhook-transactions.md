# 06 — Payment checkout & webhook-verified transactions

**What to build:** A customer selects a plan, provides phone number and email, and pays via Paystack directly from the captive portal. The backend verifies payment success via Paystack webhook (never trusting the frontend), safely ignores duplicate webhook deliveries, and tracks transaction status independently of any downstream MikroTik/voucher activity. An admin can see all transactions and their status.

**Blocked by:** 05 — Captive portal display & portal customization

**Status:** ready-for-agent

- [ ] Customer can select a plan and initiate a Paystack payment from the captive portal, providing phone number and email (required fields)
- [ ] `/api/webhooks/paystack` verifies payment via Paystack webhook signature, not frontend confirmation
- [ ] Tampered/forged webhook payloads are rejected (tested against known-good and tampered payloads)
- [ ] Duplicate webhook deliveries are idempotent — do not create a second transaction
- [ ] `transactions.status` (`pending/successful/failed/cancelled/refunded`) is tracked and reachable to `SUCCESSFUL` independent of MikroTik reachability
- [ ] Admin can view all transactions with status via `/api/payments`
- [ ] Phone/email captured at checkout create-or-match a lightweight `customers` record (exact match only, no dedup/fuzzy logic)
