# ISP Admin Dashboard

Web dashboard for ISP administrators to manage MikroTik router fleets, configure data plans, monitor revenue metrics, inspect customer transactions, and review audit logs.

## Language

### Administration & Operations

**Admin**:
An authenticated network operator with permissions to configure plans, provision routers, and inspect ISP operations.
_Avoid_: User, staff, superuser, account

**Router Fleet**:
The complete collection of MikroTik routers managed across physical locations.
_Avoid_: Device cluster, nodes, server list

**Audit Log**:
An immutable record of administrative actions, plan modifications, and router state changes.
_Avoid_: System events, activity feed, history log

### Metrics & Management

**Dashboard Summary**:
The real-time operational overview showing daily revenue, online/offline router counts, and active hotspot sessions.
_Avoid_: Analytics, stats page, overview

**Router Provisioning Dialog**:
The admin interface flow for generating provisioning credentials and downloading the RouterOS `.rsc` configuration script.
_Avoid_: Add router wizard, device setup modal
