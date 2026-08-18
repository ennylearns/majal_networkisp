# WireGuard Overlay for Router Management

MikroTik routers are deployed at customer locations behind NAT and CGNAT with dynamic or private IP addresses. We use a point-to-multipoint WireGuard VPN overlay network (`10.100.0.0/16`) to provide predictable, bi-directional, and encrypted communication between the backend API and each managed router.

## Considered Options

- **Public Static IPs**: Cost-prohibitive and unavailable on consumer ISP uplinks.
- **Dynamic DNS + Port Forwarding**: Fragile, complex for customer network setup, and exposes router management ports publicly.
- **Reverse SSH Tunnels**: High process overhead and prone to connection drops without auto-healing.
- **WireGuard Overlay (Chosen)**: Kernel-level performance, built-in reconnection, modern cryptography, and supported natively in RouterOS v7+.

## Consequences

- Backend must maintain WireGuard interface and allocate unique tunnel IPs per router.
- Direct RouterOS REST API communication is secured and isolated from public internet.
