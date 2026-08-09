# Spec: MAJAL Network — Hotspot & ISP Management System (MVP)

> Note: `to-spec` normally publishes directly to a project issue tracker with the `ready-for-agent` label, using an existing codebase's domain vocabulary and ADRs. This is a greenfield project with no repo or tracker/label vocabulary configured yet, so this spec is written to the template but delivered as a markdown file instead of published. Once you wire up the tracker (`/setup-matt-pocock-skills`), this can be posted as-is.

## Problem Statement

MAJAL Network is a paid WiFi/hotspot ISP business built on Starlink + MikroTik routers across multiple sites. Without a centralized system, running MAJAL means manually managing MikroTik users, hotspot profiles, vouchers, payments, customers, router configuration, plans, and active sessions — per router, per site. This doesn't scale: every new customer purchase, every new site, and every router hiccup currently requires manual intervention. As MAJAL grows past a handful of sites, this manual overhead becomes the bottleneck on the business itself, not the technology.

## Solution

Build a centralized software layer — a Node.js backend plus two web front ends (Admin Portal, Captive Portal) — that sits between customers, payments, and the fleet of MikroTik routers. MikroTik stays the network enforcement layer (hotspot auth, bandwidth/session/data limits, DHCP, NAT). MAJAL's software becomes the business control layer (plans, customers, payments, vouchers, router fleet management, analytics), automating the loop:

> Configure network → create plans → receive payment → automatically activate customer access → monitor the network.

The MVP goal is a working **tracer bullet**: a real customer connects to a MAJAL router, pays ₦500 via Paystack, receives a voucher, logs in, and gets internet access — with zero manual MikroTik user creation.

## User Stories

### Admin — Router fleet management

1. As a MAJAL administrator, I want to register a new router in the system, so that it can be tracked and managed centrally.
2. As a MAJAL administrator, I want the system to generate a unique, single-use, expiring provisioning token per router, so that only my intended router can use it to onboard.
3. As a MAJAL administrator, I want a copy-pasteable Winbox command containing the provisioning token, so that I can bootstrap a new router with minimal manual configuration.
4. As a MAJAL administrator, I want the provisioning script to check hardware architecture, RouterOS version, and internet connectivity before importing configuration, so that provisioning fails safely on incompatible hardware.
5. As a MAJAL administrator, I want to see each router's status (online/offline/provisioning/error), RouterOS version, architecture, location, and last-seen timestamp, so that I know the health of my fleet at a glance.
6. As a MAJAL administrator, I want the dashboard to show online vs. offline router counts, so that I can immediately spot outages across sites.
7. As a MAJAL administrator, I want router provisioning to configure hotspot bridge, ethernet ports, IP pool, IP address, DHCP, NAT masquerading, hotspot profile, walled garden, and hotspot server automatically, so that I don't hand-configure each site.
8. As a MAJAL administrator, I want the hotspot's private IP network (subnet, gateway, pool range) to be configurable per router rather than hardcoded, so that sites don't collide and I can adapt to local topology.
9. As a MAJAL administrator, I want provisioning tokens to be revocable, so that I can invalidate a token if it's compromised or unused.
10. As a MAJAL administrator, I want an audit trail of token creation, usage, and provisioning results, so that I can debug failed onboarding and detect misuse.

### Admin — Plans

11. As a MAJAL administrator, I want to create internet plans with name, price, data allowance, duration, download speed, and upload speed, so that I can offer differentiated products to customers.
12. As a MAJAL administrator, I want each plan to map to a corresponding MikroTik hotspot user profile (rate limit, session duration, data limit), so that plan enforcement happens automatically at the network layer.
13. As a MAJAL administrator, I want to enable/disable a plan without deleting it, so that I can retire offerings without breaking historical records.
14. As a MAJAL administrator, I want plan pricing and specs to be fully configurable (not hardcoded), so that I can adjust pricing based on demand.

### Admin — Vouchers

15. As a MAJAL administrator, I want the system to auto-generate a unique 6-character alphanumeric voucher code on successful payment, so that customers get a single, easy-to-type credential without manual creation.
16. As a MAJAL administrator, I want voucher codes to never be stored in plaintext, so that a database breach doesn't expose usable customer credentials.
17. As a MAJAL administrator, I want vouchers to have a lifecycle status (unused, active, expired, exhausted, disabled), so that I understand voucher state at any point.
18. As a MAJAL administrator, I want to manually disable a voucher, so that I can respond to fraud or support requests.
    18a. As a MAJAL administrator, I want each voucher tied to the purchasing customer's phone number and email, so that I can reach a customer for support, resend a lost code, or investigate a payment dispute.
    18b. As a MAJAL administrator, I want to look up a customer's voucher history by phone number or email, so that repeat customers and support requests are easy to trace.

### Admin — Payments & reliability

19. As a MAJAL administrator, I want the system to verify Paystack payments via webhook rather than trusting the frontend, so that no one can fake a successful payment.
20. As a MAJAL administrator, I want duplicate webhook deliveries to be safely ignored, so that a customer isn't double-charged or double-provisioned.
21. As a MAJAL administrator, I want payment success and voucher/network activation to be tracked as separate states, so that a temporarily unreachable router never causes a paid customer to lose their payment.
22. As a MAJAL administrator, I want failed voucher activations (due to router unavailability) to retry automatically, so that customers eventually get access without me intervening manually.
23. As a MAJAL administrator, I want to see all transactions with status (pending/successful/failed/cancelled/refunded), so that I can reconcile revenue and investigate issues.

### Admin — Monitoring & analytics

24. As a MAJAL administrator, I want a real-time dashboard showing today's revenue, active customers, active sessions, total customers, total vouchers, and online/offline router counts, so that I have a business snapshot without digging through tables.
25. As a MAJAL administrator, I want to see currently active sessions across all routers (username, router, plan, data used, IP/MAC where available), so that I can monitor live usage.
26. As a MAJAL administrator, I want revenue broken down by today/week/month and by plan/router, so that I can understand what's driving the business.
27. As a MAJAL administrator, I want plan-level sales analytics (units sold, revenue per plan), so that I can adjust pricing and packaging based on actual demand.
28. As a MAJAL administrator, I want key administrative actions (plan changes, voucher disabling, router provisioning, payments, router status changes, portal config changes) logged, so that I have an audit trail for the business.

### Admin — Captive portal customization

29. As a MAJAL administrator, I want to customize the captive portal's logo, business name, welcome message, contact info, and terms, so that the customer-facing experience reflects the MAJAL brand.
30. As a MAJAL administrator, I want to control which plans are shown on the captive portal, so that I can run promotions or limit offerings per site.

### Customer — Purchase & access

31. As a customer, I want to see MAJAL's welcome page when I connect to the WiFi, so that I know I've reached the right network.
32. As a customer, I want to view available internet plans with clear pricing, data, duration, and speed, so that I can choose what fits my needs.
33. As a customer, I want to pay for a plan via Paystack directly from the captive portal, so that I don't need a separate app or account.
34. As a customer, I want to receive my voucher code automatically after payment, so that I don't have to wait for manual activation.
    34a. As a customer, I want to provide my phone number and email at checkout, so that I can recover my voucher code if I lose it or reconnect later.
35. As a customer, I want to log in with my voucher code, so that I can start using the internet immediately.
36. As a customer, I want to see my remaining data/time/session status, so that I know when I need to renew.
37. As a customer, I want to access the payment and login pages even before I've authenticated (walled garden), so that I can actually complete a purchase without being blocked by the hotspot itself.

## Implementation Decisions

- **Two frontends, one backend**: MAJAL Admin Portal (internal, admin-only) and MAJAL Captive Portal (public, customer-facing) both talk to a single Node.js/TypeScript backend (Express or Fastify) over HTTPS. No direct frontend-to-database or frontend-to-MikroTik/Paystack access.
- **Database**: PostgreSQL. Core tables: `admins`, `routers`, `router_provisioning_tokens`, `plans`, `customers`, `vouchers`, `transactions`, `sessions`, `router_events`, `portal_settings`.
- **MikroTik integration isolated behind a `MikroTikService`** with a defined interface (`createUser`, `deleteUser`, `disableUser`, `enableUser`, `createProfile`, `getUsers`, `getActiveSessions`, `disconnectUser`, `getRouterStatus`, `provisionRouter`), rather than RouterOS API calls scattered through the codebase. Implementation uses the RouterOS REST API (per prior conversation: `/rest/ip/hotspot/user`, `/rest/ip/hotspot/user/profile`, `/rest/ip/hotspot/active`, `/rest/system/resource`, etc.), reached per-router over a router-initiated WireGuard tunnel to a central hub (required due to Starlink CGNAT — routers cannot be reached inbound directly).
- **Payment integration isolated behind a `PaymentService`**, initially implementing Paystack (`initialize`, `verifyWebhook`, `verifyTransaction`). Abstracted so a second provider (P2 roadmap item) doesn't require touching calling code.
- **Payment state and network-activation state are modeled separately.** A `transactions.status` of `SUCCESSFUL` must be achievable independent of MikroTik reachability. Voucher activation gets its own state machine: `PENDING → ACTIVATED | FAILED`, with automatic retry on `FAILED` when the router is unreachable. This is the core reliability guarantee of the system: a successful payment is never lost due to a router being offline.
- **Provisioning tokens**: randomly generated, single-use, expiring, revocable, scoped to exactly one router, transmitted only over HTTPS. Backend records creation time, use time, associated router, and provisioning result for every token.
- **Provisioning flow**: Admin registers router → backend generates router ID + provisioning token → admin runs a generated `/tool fetch` + `/import` Winbox command on the physical router → router downloads and imports a `.rsc` config (hotspot bridge, ports, IP pool/address, DHCP, NAT masquerade, hotspot profile, walled garden, hotspot server, WireGuard peer config) → router reports back as MAJAL-managed.
- **API surface** (initial): `/api/auth`, `/api/routers`, `/api/routers/:id`, `/api/routers/:id/provision`, `/api/plans`, `/api/vouchers`, `/api/customers`, `/api/payments`, `/api/payments/:id`, `/api/sessions`, `/api/portal`, `/api/webhooks/paystack`, `/provision/:token`.
- **Customer identity for MVP**: no mandatory account registration. Customers are tracked via voucher, payment reference, and session/device info. Full customer accounts are out of scope for MVP (see below).
- **Vouchers**: a single 6-character alphanumeric code is auto-generated on payment success and used as both the MikroTik hotspot username and password (standard prepaid-voucher pattern — one code, nothing to remember separately). Character set excludes visually ambiguous characters (`0`/`O`, `1`/`I`/`L`) since the code will be read off a receipt/SMS and typed on a phone keyboard at the captive portal. Code is generated, checked for uniqueness against existing active/unused vouchers, and regenerated on collision (36^6 ≈ 2.2 billion possible codes with the full set; the reduced ambiguity-free set is smaller but still comfortably collision-safe at MAJAL's expected volume — recheck this if voucher volume ever reaches the tens of millions). Code is hashed at rest (same rationale as before: DB breach shouldn't yield usable credentials); admin support lookups by code hash the input and compare, matching the pattern used for password verification — the plaintext code is returned to the customer exactly once, at issuance (API response + confirmation SMS/email/portal display), and never re-displayed by the system afterward.
- **Voucher ↔ customer contact info**: `vouchers` gains `phone_number` and `email` columns, captured at checkout (required fields on the payment/plan-selection form, not the existing "no full customer registration" account system). This is a lightweight contact record attached to the voucher/transaction, not a customer account — no login, no password, no customer-side auth. It exists purely so MAJAL can reach the customer or recover a lost code, and so repeat customers can be traced by admin lookup (§18b above). If a `customers` table entry doesn't already exist for that phone/email, one can be created or matched here, but that identity resolution is intentionally lightweight for MVP (exact matching on phone/email, no dedup/fuzzy-matching logic).
- **IP addressing**: hotspot subnet/gateway/pool is configurable per router at provisioning time (not hardcoded), since each site is provisioned independently and multiple sites may reuse the same default range unless explicitly changed.

## Testing Decisions

- Tests should exercise external behavior at the two integration seams — `MikroTikService` and `PaymentService` — rather than internal implementation details of provisioning logic, voucher generation, etc. These are the two points where MAJAL's software meets systems it doesn't control (RouterOS API, Paystack), and they're exactly the points where "temporarily unavailable" failure modes need to be provably handled.
- **`MikroTikService`**: test against a fake/mock implementation of the interface (not a live router) that can simulate success, timeout, and unreachable-router conditions. Verify that a `FAILED` voucher activation due to router unavailability retries and eventually succeeds once the fake router becomes reachable again, and that it never blocks or reverses a `SUCCESSFUL` transaction.
- **`PaymentService`**: test webhook verification against known-good and tampered/forged Paystack webhook payloads (reject the latter), and test idempotency — sending the same webhook twice must not create two transactions or two vouchers.
- **Core business loop (tracer bullet)**: an end-to-end test simulating the full path — plan selection → payment webhook → transaction created → voucher generated → MikroTik user created (via faked service) → login validated — should exist as the primary regression guard, since this is the MVP's single most important behavior per the "MVP Development Strategy" (§47 of the source doc).
- Provisioning-token logic (generation, expiry, single-use enforcement, revocation) should be tested directly since it's a security-relevant boundary, independent of whether a real router is involved.
- Voucher code generation should be tested directly: correct length (6), correct character set (no ambiguous characters), uniqueness enforcement/regeneration on collision, and that the plaintext code is retrievable exactly once at issuance but never reconstructable from the stored hash afterward.
- No existing codebase/test suite exists yet to draw prior art from — this is greenfield. Recommend establishing the `MikroTikService` and `PaymentService` fakes as first-class, reusable test doubles early, since nearly every other module (vouchers, sessions, provisioning, dashboard) will end up depending on one or both.

## Out of Scope

- Full customer account registration/login (MVP identifies customers via voucher + payment reference only).
- RADIUS-based centralized authentication (flagged in the original doc as P2/future — local per-router hotspot users are the MVP approach).
- Multiple payment providers beyond Paystack.
- SMS/WhatsApp voucher delivery.
- Advertising, custom domains, reseller system.
- Mobile admin application.
- Advanced bandwidth analytics beyond basic session data.
- Portal customization beyond logo/name/message/plans/contact/terms (no visual theme builder in MVP).

## Further Notes

- The reliability guarantee — **payment success must never be reversed or lost due to router unavailability** — is the single most load-bearing decision in this spec. Every other feature (dashboard, analytics, portal customization) is secondary to getting this loop right, per the source document's own MVP strategy (§47, §55–56).
- The provisioning system explicitly took inspiration from a supplied MikroTik bootstrap script (architecture/version/connectivity checks before importing config); that script wasn't included in this conversation's context, so the actual `.rsc` template will need to be written or sourced separately before Phase 1/5 implementation.
- Given the multi-site + Starlink CGNAT context from earlier in this conversation, the WireGuard router-initiated tunnel pattern should be treated as a hard requirement for `MikroTikService` reachability, not an optional hardening step — it's baked into the seam decision above.

---

### Seam check before this gets built

Per the process, the seams should match your expectations before this goes further. I've proposed **two integration seams** — `MikroTikService` and `PaymentService` — as the natural boundaries, since they're the only two external systems in the whole architecture (everything else is your own DB/business logic). The ideal-single-seam instinct would push toward merging these, but they're genuinely different systems with different failure modes (network reachability vs. payment fraud/idempotency), so I split them rather than force one.

Does that match how you want to test this, or would you rather collapse it further (e.g. one general "external integrations" seam) or split it more (e.g. separate seam for provisioning vs. hotspot-user operations within MikroTik)?
