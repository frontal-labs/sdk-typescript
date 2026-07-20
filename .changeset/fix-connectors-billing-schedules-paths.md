---
"@frontal-labs/connectors": patch
"@frontal-labs/billing": patch
"@frontal-labs/schedules": patch
---

Fix request paths to match the real backend services.

- **connectors**: catalog operations now call `/v1/connectors/catalog` and
  `/v1/connectors/catalog/{slug}` (were `/connectors` / `/connectors/{slug}`),
  and replay calls `/v1/connectors/sync-runs/{id}/replay`.
- **billing** & **schedules**: removed the hardcoded `/v1/` prefix from routes so
  they no longer produce a doubled `/v1/v1/` path against the versioned base URL.
