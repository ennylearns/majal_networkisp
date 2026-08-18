# Captive Portal

Web application presented to unauthenticated Wi-Fi guests for voucher authentication, self-service plan purchase via Paystack, and active hotspot session monitoring.

## Language

### Guest Experience

**Captive Portal**:
The web interface intercepted by MikroTik Hotspot before internet access is granted to unauthenticated devices.
_Avoid_: Splash page, landing page, login screen

**Guest**:
An unauthenticated Wi-Fi user on the local network seeking internet access.
_Avoid_: Customer, user, subscriber, client

**Voucher Code**:
The plain-text string entered by a guest into the portal to authenticate and initiate internet access.
_Avoid_: Password, PIN, secret, token

### Portal Views & Features

**Plan Catalog**:
The selection of available Plans presented to guests for self-service purchase.
_Avoid_: Pricing table, packages, store, menu

**Session Dashboard**:
The live status view displaying remaining data allowance, elapsed session time, and network stats for an active Wi-Fi connection.
_Avoid_: Account page, profile, connection manager
