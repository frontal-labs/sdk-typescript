---
"@frontal-labs/agents": patch
"@frontal-labs/ai": patch
"@frontal-labs/audit": patch
"@frontal-labs/auth": patch
"@frontal-labs/billing": patch
"@frontal-labs/blob": patch
"@frontal-labs/connectors": patch
"@frontal-labs/core": patch
"@frontal-labs/data": patch
"@frontal-labs/functions": patch
"@frontal-labs/governance": patch
"@frontal-labs/lineage": patch
"@frontal-labs/observability": patch
"@frontal-labs/ontology": patch
"@frontal-labs/pipelines": patch
"@frontal-labs/react": patch
"@frontal-labs/schedules": patch
"@frontal-labs/sdk": patch
"@frontal-labs/testing": patch
"@frontal-labs/webhooks": patch
"@frontal-labs/workflows": patch
---

Declarations resolve under `moduleResolution: nodenext`. The build now adds
explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
`new Frontal()` is typed for NodeNext consumers instead of silently `any`.
Runtime code is unchanged.
