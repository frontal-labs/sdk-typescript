---
"@frontal-labs/sdk": minor
"@frontal-labs/ontology": minor
---

Use the SDK directly, without a generated client.

- `new Frontal({ apiKey })` and `frontal` are typed by the generated ontology
  once `ontology.d.ts` augments `FrontalOntologyRegistry`. With no
  augmentation the registry is empty and the client is untyped, as before.
- The runtime metadata is optional. Without it, the first use of an entity
  reads the object types from the API once per client, derives the same
  metadata the generator emits, and caches it. Concurrent first calls share
  one request, and a failed read is retried on the next call. A name the live
  ontology does not contain rejects on use.
- With the metadata passed in (the generated `.frontal/client.ts` does this),
  no request is made, as before.
- `createFrontalClient<TOntology>` and `Frontal<TOntology>` default to the
  registry. Passing an ontology type explicitly still works.
