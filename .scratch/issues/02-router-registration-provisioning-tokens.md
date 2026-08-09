# 02 — Router registration & provisioning tokens

**What to build:** An admin can register a new router in the system and receive a unique, single-use, expiring provisioning token, plus a copy-pasteable Winbox command containing that token. Token lifecycle (creation, use, revocation) is fully audited.

**Blocked by:** 01 — Backend & auth foundation

**Status:** ready-for-agent

- [ ] Admin can register a new router (`/api/routers`), which is tracked centrally with a generated router ID
- [ ] Backend generates a unique, single-use, expiring provisioning token per router
- [ ] Admin receives a copy-pasteable Winbox command (`/tool fetch` + `/import`) containing the provisioning token, pointing at `/provision/:token`
- [ ] Tokens are scoped to exactly one router and transmitted only over HTTPS
- [ ] Tokens are revocable by an admin, invalidating them before use
- [ ] Backend records creation time, use time, associated router, and provisioning result for every token
- [ ] Provisioning-token logic (generation, expiry, single-use enforcement, revocation) is tested directly, independent of any real router
