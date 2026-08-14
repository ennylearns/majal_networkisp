# 13 — Fix Plan Field Mismatch Between Portal and API

**What to build:** Right now the captive portal's plan cards silently render garbage (e.g. `NaN B`, `NaN mins`, `NaN Mbps`) because the frontend `Plan` interface names differ from what the API actually returns. Fix this so real plan data (data allowance, duration, speeds) displays correctly on every plan card a customer sees.

The frontend expects `data_limit_bytes` (a number in bytes), `duration_minutes` (a number in minutes), `speed_down_kbps`, and `speed_up_kbps`. The database and API return `data_allowance` (a BIGINT), `duration` (an INTEGER whose unit is unspecified), `download_speed` and `upload_speed` (strings like `"10M"`).

The resolution is to align one side to the other — either rename the frontend interface fields to match the API column names and update the format helpers, or add a mapping/transform layer at the API boundary. Whichever approach is chosen, the format helpers must also be updated to handle the actual types returned (strings like `"10M"` are not numbers in kbps, so the helper logic needs to change or the API needs to normalise the value before sending).

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Plan cards on the captive portal show the correct data allowance for each plan (not `NaN`)
- [x] Plan cards show the correct duration (not `NaN`)
- [x] Plan cards show the correct download/upload speed (not `NaN`)
- [x] `formatBytes`, `formatDuration`, and `formatSpeed` handle `undefined` and `null` gracefully (no silent `NaN` output)
- [x] A plan with no data cap displays "Unlimited Data", a plan with no speed cap displays "Uncapped"
- [x] The fix is covered by at least one integration test or snapshot test verifying the rendered card against a real API response shape
