# Context Map

Map of bounded contexts in the Majal Network ISP monorepo.

## Contexts

| Context | Path | Description |
| :--- | :--- | :--- |
| **Backend API** | [backend/CONTEXT.md](file:///backend/CONTEXT.md) | Node.js/TypeScript REST API for ISP operations, MikroTik RouterOS provisioning, WireGuard management, customer billing, and voucher generation. |
| **Captive Portal** | [captive-portal/CONTEXT.md](file:///captive-portal/CONTEXT.md) | Web application presented to unauthenticated Wi-Fi guests for voucher authentication, plan purchasing, and session monitoring. |
| **ISP Admin Dashboard** | [majal-isp-admin/CONTEXT.md](file:///majal-isp-admin/CONTEXT.md) | Web dashboard for ISP administrators to manage router fleets, configure plans, monitor revenue, and review audit logs. |

## Relationships

- **Captive Portal → Backend API**: Intercepted guests purchase **Plans** via Paystack, authenticate with **Voucher Codes**, and stream active **Hotspot Session** bandwidth metrics.
- **ISP Admin Dashboard → Backend API**: **Admins** generate **Provisioning Tokens** / `.rsc` scripts for **Routers**, configure **Plans**, and inspect **Dashboard Summaries** & **Audit Logs**.
- **Backend API → MikroTik Routers**: Provisions routers over **WireGuard VPN**, deploys Hotspot profiles, synchronizes active **Vouchers**, and collects **Hotspot Session** accounting.

## Architecture Decisions

- System-wide ADRs: `docs/adr/`
- Context-specific ADRs: `<context>/docs/adr/`
