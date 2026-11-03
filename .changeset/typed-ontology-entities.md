---
"@frontal-labs/ontology": minor
"@frontal-labs/sdk": minor
---

Add typed ontology entity handles. `createFrontalClient<TOntology>(config, runtime?)` now accepts the generated `Ontology` type and runtime metadata, and exposes `ontology.<Entity>` with `get`, `create`, `update` (non-atomic merge) and `delete`, plus lazy `belongsTo`/`hasOne` relation accessors. Existing calls without a type argument are unchanged.
