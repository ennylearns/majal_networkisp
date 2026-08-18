# RSC Script Provisioning via Expiring Token

To provision raw MikroTik routers with zero custom binary installation, the backend generates an automated RouterOS `.rsc` configuration script authenticated with a single-use, 24-hour expiring Provisioning Token. The script validates hardware/firmware, configures interfaces, and reports bootstrap status back to the backend.

## Considered Options

- **TR-069 / CWMP**: Requires maintaining a complex Auto Configuration Server (ACS) and RouterOS TR-069 package dependencies.
- **Custom RouterOS Package (NPK)**: Requires MikroTik development kit and package signing keys.
- **Manual WebFig / WinBox Setup**: Error-prone, slow, and inconsistent across router fleets.
- **RSC Script with Expiring Token (Chosen)**: Leverages native RouterOS `.rsc` import and `/tool fetch` HTTP POST for automated reporting with no third-party dependencies.

## Consequences

- Tokens auto-expire after 24 hours to prevent unauthorized replay if script is intercepted.
- Router provisioning relies on target routers running RouterOS v7+ on ARM architecture with internet access.
