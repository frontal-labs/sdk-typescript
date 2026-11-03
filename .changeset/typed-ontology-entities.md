---
"@frontal-labs/ontology": minor
"@frontal-labs/sdk": minor
---

Add typed ontology entities. `createFrontalClient<TOntology>(config, runtime)`
accepts the generated `Ontology` type and the runtime metadata emitted by the
Frontal CLI, and exposes `ontology.<Entity>` with:

- `get(id)`, `delete(id)`.
- `create(input)`: the id is generated client-side.
- `put(id, input)`: create or replace under an explicit id.
- `update(id, patch)`: changes only writable fields. It is a GET, merge, then
  PUT, so it is not atomic.
- Lazy `belongsTo` relation accessors, such as `await customer.company()`.

Responses and inputs are checked against the runtime metadata and throw
`ValidationError` (`INVALID_RESPONSE` or `INVALID_INPUT`) with per-field
detail. Unknown entities throw a `TypeError` listing the known entities.
`OntologyDefinition` rejects invalid hand-written ontologies at compile time.

Breaking within this release: `create(id, input)` is now `put(id, input)`, and
`create(input)` generates the id. `hasOne` relations are removed. The runtime
metadata shape is `OntologyRuntime<O>`. Existing calls without a type argument
are unchanged.
