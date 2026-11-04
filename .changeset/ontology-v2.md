---
"@frontal-labs/ontology": minor
"@frontal-labs/sdk": patch
---

Ontology contract v2 on typed entities.

- `query({ where, limit, cursor })`: one page of matching entities. `where`
  is typed per field: strings take `eq`, `in`, `contains`, `startsWith`;
  numbers take `eq`, `in`, `gt`, `gte`, `lt`, `lte`; booleans take `eq`; enums
  take `eq` and `in` with their declared values. Unknown fields and operators
  the type does not allow are rejected before any request.
- `list()` follows the pages of `query` until the last one, with a limit of
  10,000 pages.
- `update` is now conditional: it reads the object's `ETag` and writes with
  `If-Match`. A write that lost a race is retried from a fresh read, up to three
  attempts, then throws a `ConflictError` with code `PRECONDITION_FAILED`. It is
  never written without an `ETag`.
- Relations carry a `cardinality`. `belongsTo` keeps its foreign key;
  `hasOne`, `hasMany` and `manyToMany` resolve through relationship instances
  and need a `relationshipTypeId`. `hasOne` with more than one target throws
  `TOO_MANY_RELATIONSHIPS`.

These endpoints are ontology contract v2. A backend that does not serve them
rejects the calls.
