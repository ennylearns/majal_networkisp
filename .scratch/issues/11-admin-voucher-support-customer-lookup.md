# 11 — Admin voucher support & customer lookup

**What to build:** An admin can manually disable a voucher (e.g. for fraud or support requests) and look up a customer's voucher history by phone number or email, so repeat customers and support requests are easy to trace.

**Blocked by:** 07 — Voucher generation & MikroTik activation

**Status:** ready-for-agent

- [ ] Admin can manually disable a voucher via `/api/vouchers`, moving it to the `disabled` lifecycle state
- [ ] Disabling a voucher revokes/disables the corresponding MikroTik hotspot user via `MikroTikService.disableUser`
- [ ] Admin can look up a customer's voucher history by phone number or email
- [ ] Lookup results show voucher status, issuance date, and associated transaction/plan
