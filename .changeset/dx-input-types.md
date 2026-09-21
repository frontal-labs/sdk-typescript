---
"@frontal-labs/audit": patch
"@frontal-labs/blob": patch
---

Input option types now derive from `z.input`, so schema-defaulted fields (e.g. `AuditEventInput.status`, `SemanticSearchOptions.threshold`) are optional for callers as intended.
