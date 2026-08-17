# Spec: Router WireGuard Tunnel & REST API Provisioning Integration

Status: ready-for-agent

## Problem Statement

When provisioning a new MikroTik router for the MAJAL Network, the central system requires secure, authenticated REST API access over a private WireGuard tunnel to manage hotspot users and active sessions. Currently, the database schema lacks storage for router tunnel IPs and API credentials, the provisioning workflow does not automatically assign unique tunnel addresses or random passwords, and the generated `.rsc` configuration script neither assigns the tunnel IP to the WireGuard interface nor configures the `majal-api` user and restricted HTTP service. As a result, the backend cannot establish authenticated REST communication with newly provisioned routers.

## Solution

Automate the allocation, persistence, and RouterOS-side configuration of WireGuard tunnel IP addresses and dedicated API credentials during the router provisioning lifecycle.

1. Store each router's assigned WireGuard tunnel IP and API password in the database.
2. During provisioning token generation, dynamically calculate a non-conflicting tunnel IP address and generate a cryptographically random password, storing both with the router record.
3. Include the API credentials, restricted HTTP service configuration, and tunnel IP address assignment in the generated `.rsc` bootstrap script.
4. Ensure the REST service on the router is enabled and restricted strictly to the WireGuard subnet for secure management access.

## User Stories

1. As a network administrator, I want each router to be automatically assigned a unique WireGuard tunnel IP address upon provisioning, so that the central backend can route management traffic to each router without manual IP planning.
2. As a network administrator, I want a cryptographically random, unique API password generated for every router provisioning cycle, so that no default or hardcoded credentials exist across the fleet.
3. As a network administrator, I want re-generating a provisioning token to rotate the API password and re-affirm the tunnel IP, so that compromised credentials can be revoked and refreshed simply by re-provisioning.
4. As a network administrator, I want the generated `.rsc` bootstrap script to create the dedicated `majal-api` RouterOS user with full administrative privileges, so that the backend can execute hotspot user management commands.
5. As a network administrator, I want the generated `.rsc` script to assign the allocated tunnel IP to the `wireguard1` interface, so that the router immediately joins the WireGuard overlay network upon running the script.
6. As a network administrator, I want the RouterOS `www` service enabled and restricted exclusively to the WireGuard management subnet, so that management endpoints are not exposed to the public internet or hotspot clients.
7. As a network administrator, I want the insecure `www-ssl` service disabled if certificates are not configured, so that unconfigured SSL services do not produce connection errors or attack surface.
8. As a backend service, I want to retrieve the router's tunnel IP and API credentials directly from the database when initiating REST calls, so that requests can be dispatched securely across the WireGuard tunnel.
9. As a developer, I want provisioning integration tests to verify the generation and database storage of tunnel IPs and passwords, so that regressions in the onboarding pipeline are caught automatically.
10. As a developer, I want configuration script rendering tests to assert that the proper user creation, service restrictions, and IP assignment commands are emitted in the `.rsc` output.

## Implementation Decisions

- **Database Schema Changes**:
  - Add `wireguard_tunnel_ip` (VARCHAR) to the routers table.
  - Add `api_password` (VARCHAR) to the routers table.

- **Tunnel IP Allocation Algorithm**:
  - Calculate dynamic tunnel addresses within the 10.100.0.0/16 overlay block based on router identifier:
    - Base format: `10.100.${Math.floor(routerId / 256)}.${routerId % 256}`
  - Assign subnet mask `/24` on the router interface configuration.

- **Credential Generation & Lifecycle**:
  - Generate API passwords using 16 bytes of cryptographically secure random data (32-character hex string).
  - Persist credentials and tunnel IP on the router entity when generating or refreshing a provisioning token.
  - Return the token, generated password, and tunnel IP from the token generation service layer.

- **RSC Script Template Additions**:
  - Add user creation: `/user add name=majal-api password="<api_password>" group=full`
  - Configure HTTP service: `/ip service set www address=10.100.0.0/16 disabled=no`
  - Disable SSL service: `/ip service set www-ssl disabled=yes`
  - Assign interface address: `/ip address add address=<tunnel_ip>/24 interface=wireguard1`

- **API & Service Signatures**:
  - Extend the router configuration model consumed by the script generator to require `apiPassword` and `wireguardTunnelIp`.
  - Token creation endpoints update the router record and pass the credentials into the script generation pipeline.

## Testing Decisions

- **What makes a good test**:
  - Focus on observable outputs: database state changes after token creation, generated script text contents, and API endpoint responses. Do not mock internal helper functions.
- **Modules to be tested**:
  - Provisioning service tests: verify `generateToken` persists `wireguard_tunnel_ip` and `api_password` to the database and returns expected credentials.
  - RSC script generator tests: verify generated script includes the exact `/user add`, `/ip service set www`, and `/ip address add` commands.
  - Router management API route integration tests: verify `POST /api/routers/:id/provision-token` and `GET /api/routers/:id/provision.rsc` flow.
- **Prior art**:
  - Existing provisioning test suite in `tests/provisioning.test.ts` and script generation test in `tests/rsc.test.ts`.

## Out of Scope

- Automatic setup or provisioning of the central server's WireGuard interface (handled by server infrastructure setup).
- Dynamic IP address pool recycling or custom subnet CIDR overrides per router.
- RADIUS server backend integration (remains direct RouterOS REST integration).

## Further Notes

- RouterOS REST API communication operates over HTTP without TLS inside the encrypted WireGuard tunnel, avoiding certificate management overhead on edge routers while maintaining channel confidentiality.
