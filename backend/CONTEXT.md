# Backend API

Node.js/TypeScript REST API handling router provisioning, WireGuard VPN tunnels, MikroTik RouterOS orchestration, billing, voucher lifecycle, and session tracking.

## Language

### Catalog & Billing

**Plan**:
A commercial internet package defining price, data allowance, validity duration, and bandwidth limits.
_Avoid_: Package, tariff, tier

**Customer**:
An identified buyer associated with transactions, contact information, and billing history.
_Avoid_: Client, user, account, subscriber

**Transaction**:
A payment record with Paystack linking a customer purchase to a plan and router.
_Avoid_: Order, invoice, payment

### Network & Router Lifecycle

**Router**:
A physical or virtual MikroTik RouterOS device deployed at a location to provide Wi-Fi hotspot access.
_Avoid_: Gateway, node, box, server

**Provisioning**:
The initial automated bootstrap process configuring a raw MikroTik router with WireGuard VPN, DHCP, and Hotspot services to connect back to the central backend.
_Avoid_: Setup, installation, onboard

**Provisioning Token**:
A single-use, 24-hour expiring secret used by a router during `.rsc` script execution to authenticate its bootstrap report.
_Avoid_: API token, setup key, auth token

**Router Lifecycle Status**:
The operating state of a router: `unprovisioned`, `provisioning`, `online`, `offline`, or `error`.
_Avoid_: Health state, device condition

### Vouchers & Hotspot Access

**Voucher**:
A unique Wi-Fi access credential (hashed in DB) purchased by or issued to a customer, granting hotspot access according to a Plan.
_Avoid_: Ticket, pass, code, card

**Voucher Status**:
The usage lifecycle state of a voucher: `unused`, `active`, `exhausted`, `expired`, or `disabled`.
_Avoid_: Activation state, token status

**Router Sync Status**:
The synchronization state of a voucher onto the MikroTik router: `PENDING`, `SYNCED`, or `FAILED`.
_Avoid_: Activation status, push status

**Hotspot Session**:
A temporary authorized Wi-Fi connection on a router, identified by MAC and IP address, tracking live bandwidth and active status.
_Avoid_: User session, login, connection
