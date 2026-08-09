# 05 — Captive portal display & portal customization

**What to build:** A customer connecting to WiFi sees MAJAL's welcome page and a list of available plans with clear pricing, data, duration, and speed. An admin can customize the portal's branding (logo, business name, welcome message, contact info, terms) and control which plans are shown.

**Blocked by:** 04 — Plan management

**Status:** ready-for-agent

- [ ] Captive portal renders a welcome page confirming the customer has reached the MAJAL network
- [ ] Captive portal lists available plans (price, data, duration, download/upload speed) sourced from `/api/plans`
- [ ] Admin can configure logo, business name, welcome message, contact info, and terms via `/api/portal`
- [ ] Admin can control which plans are visible on the captive portal (e.g. for promotions or per-site limits)
- [ ] Portal config changes are reflected on the captive portal without a backend redeploy
