---
"@frontal-labs/ontology": minor
"@frontal-labs/sdk": minor
"@frontal-labs/core": patch
---

Add typed ontology entities. `createFrontalClient<TOntology>(config, runtime)`
accepts the generated `Ontology` type and the runtime metadata emitted by the
Frontal CLI, and exposes `ontology.<Entity>` with:

- `list()`: every object of the entity's object type. The backend does not
  page this list, so it is returned in one call.
- `get(id)`, `delete(id)`.
- `create(input)`: the server generates the id.
- `put(id, input)`: writes the whole object under an explicit id.
- `update(id, patch)`: changes only writable fields. It is a GET, merge, then
  PUT, so it is not atomic.
- Lazy `belongsTo` relation accessors, such as `await customer.company()`.

Stored fields live under the object's `properties`; the entity exposes them at
the top level with `id` set to the object id. Responses and inputs are checked
against the runtime metadata and throw `ValidationError` (`INVALID_RESPONSE` or
`INVALID_INPUT`) with per-field detail. A record of another object type is
rejected. Unknown entities throw a `TypeError` listing the known entities.
`OntologyDefinition` rejects invalid hand-written ontologies at compile time.

Breaking within this release: `create(id, input)` is now `put(id, input)`, and
`create(input)` generates the id. `hasOne` relations are removed. The runtime
metadata requires `objectTypeIds` and has the shape `OntologyRuntime<O>`.
Existing calls without a type argument are unchanged.

`@frontal-labs/core`: `preserveKeys` now applies to each element of a list
response, so property names inside `properties` are kept exactly as sent.
