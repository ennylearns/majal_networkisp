# Direct RouterOS REST API over RADIUS

Hotspot user accounts, bandwidth limitation queues, and active session monitoring are managed directly via RouterOS v7 REST API over the WireGuard management tunnel, rather than routing authentication through an external RADIUS (FreeRADIUS) server.

## Considered Options

- **External RADIUS Server**: Industry standard for enterprise telcos, but introduces a separate stateful FreeRADIUS service, database synchronization lag, and complex failover topology.
- **Direct RouterOS REST API (Chosen)**: Utilizes native RouterOS v7 JSON/REST endpoints over WireGuard for atomic user creation, profile attachment, and real-time session polling without third-party services.

## Consequences

- Eliminates operational complexity of a standalone RADIUS cluster.
- Direct HTTP requests over WireGuard introduce minor network latency per user provisioning call, suitable for ISP router fleet scale.
