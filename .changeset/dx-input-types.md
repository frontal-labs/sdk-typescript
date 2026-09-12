---
"@frontal-labs/audit": patch
"@frontal-labs/graph": patch
"@frontal-labs/blob": patch
"@frontal-labs/workers": patch
---

Input option types now derive from `z.input`, so schema-defaulted fields (e.g. `AuditEventInput.status`, `SemanticSearchOptions.threshold`) are optional for callers as intended.
