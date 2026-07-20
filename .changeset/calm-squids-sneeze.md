---
"@frontal-labs/agents": patch
"@frontal-labs/audit": patch
"@frontal-labs/observability": patch
---

Add missing API surfaces

- Add FRONTAL_AGENTS_API_URL env var support to agents client for
  per-service URL overrides
- Add AuditSdkEventSchema alias to audit schemas
- Add report() method to ObservabilityEventsNamespace for single
  event reporting
