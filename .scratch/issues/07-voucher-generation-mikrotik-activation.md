# 07 — Voucher generation & MikroTik activation

**What to build:** On a successful transaction, the system generates a unique 6-character alphanumeric voucher code (ambiguity-free character set), hashes it at rest, and returns the plaintext exactly once at issuance. The voucher is tied to the customer's phone/email. A MikroTik hotspot user is created via `MikroTikService`, tracked through its own `PENDING → ACTIVATED | FAILED` activation state machine with automatic retry on router unavailability — so a successful payment is never lost or reversed due to a router being offline. This ticket also delivers the primary end-to-end regression test for the whole system.

**Blocked by:** 06 — Payment checkout & webhook-verified transactions, 03 — Router provisioning execution, fleet status & walled garden

**Status:** ready-for-agent

- [ ] On `SUCCESSFUL` transaction, a unique 6-character voucher code is generated, excluding visually ambiguous characters (`0`/`O`, `1`/`I`/`L`)
- [ ] Voucher code uniqueness is enforced against existing active/unused vouchers, regenerating on collision
- [ ] Voucher code is hashed at rest; plaintext is returned exactly once at issuance (API response) and never re-displayed afterward
- [ ] Admin support lookup hashes the input code and compares against the stored hash (same pattern as password verification)
- [ ] Voucher record includes `phone_number` and `email` from checkout
- [ ] Voucher lifecycle status modeled: unused, active, expired, exhausted, disabled
- [ ] Voucher activation state machine: `PENDING → ACTIVATED | FAILED`, calling `MikroTikService.createUser` using the plan's mapped hotspot profile
- [ ] Failed activations (router unreachable) retry automatically until they succeed, without ever blocking or reversing the underlying `SUCCESSFUL` transaction
- [ ] End-to-end tracer-bullet test: plan selection → payment webhook → transaction created → voucher generated → MikroTik user created (via fake service) → login validated
- [ ] Voucher code generation tested directly: correct length, correct character set, uniqueness/regeneration on collision, one-time plaintext retrieval, non-reconstructable from stored hash
