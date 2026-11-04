# @frontal-labs/ontology

Client for the Frontal Ontology platform (`/v1/ontology/*`). The API is composed
of independent subdomain services, each exposed as a namespace:
`engine`, `objects`, `relationships`, `schemas`, `versions`, `validation`,
`transformations`, `reasoning`, `rollouts`, `rollups`, `extract`, and `events`.

## Installation

```bash
npm install @frontal-labs/ontology
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const ontology = f.ontology;

// Generate an ontology with the engine, then browse object types.
const proposal = await ontology.engine.generate({
  description: "Model a billing dispute lifecycle with SLA states.",
});
const objectTypes = await ontology.objects.listObjectTypes({ limit: 10 });
```


## Usage

### Explicit config

```ts
import { createOntologyClient } from "@frontal-labs/ontology";

const ontology = createOntologyClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

// Define/validate a schema via the schemas subdomain.
await ontology.schemas.create({
  name: "Invoice",
  fields: [
    { name: "amount", type: "number", required: true },
    { name: "currency", type: "string", required: true },
  ],
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createOntologyClient } from "@frontal-labs/ontology";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const ontology = createOntologyClient(client);
```

### Validate a payload

```ts
await ontology.validation.validatePayload({
  objectType: "Incident",
  payload: { severity: "high" },
});
```

### AI-powered generation & inference

```ts
const proposal = await ontology.engine.generate({
  description: "Model a billing dispute lifecycle with ownership and SLA states.",
  substrates: ["billing", "support"],
});
const inferred = await ontology.engine.inferClasses({ samples: [] });
```

### Versions & rollouts

```ts
const bundle = await ontology.versions.createReleaseBundle({ version: "2.0.0" });
const rollout = await ontology.rollouts.create({ bundleId: bundle.id });
const rolloutId = rollout.id as string;
await ontology.rollouts.start(rolloutId);
const status = await ontology.rollouts.status(rolloutId);
```

## Typed entities

`frontal sync` writes `.frontal/ontology.d.ts` and `.frontal/client.ts` from
your ontology. Import the generated factory and every entity is typed:
properties, enum values, relations and write inputs all come from the ontology.

```ts prelude
import { createFrontalClient } from "@frontal-labs/sdk";
import type { OntologyRuntime } from "@frontal-labs/ontology";

// `.frontal/ontology.d.ts` (generated; shown here in trimmed form).
interface Ontology {
  Company: {
    read: { id: string; name: string };
    create: { name: string };
    update: { name?: string };
    relations: Record<never, never>;
  };
  Customer: {
    read: { id: string; email: string; status: "active" | "closed"; companyId?: string | null };
    create: { email: string; status?: "active" | "closed" | null };
    update: { email?: string; status?: "active" | "closed" | null; companyId?: string | null };
    relations: { company: { cardinality: "belongsTo"; target: "Company"; optional: true } };
  };
}

// `.frontal/client.ts` passes this runtime metadata (generated).
const runtime = {
  entities: ["Company", "Customer"],
  objectTypeIds: { Company: "ot_company", Customer: "ot_customer" },
  fields: {
    Company: {
      id: { kind: "string", required: true },
      name: { kind: "string", required: true },
    },
    Customer: {
      id: { kind: "string", required: true },
      email: { kind: "string", required: true },
      status: { kind: { enum: ["active", "closed"] }, required: true },
      companyId: { kind: "string", required: false },
    },
  },
  writable: { Company: ["name"], Customer: ["email", "status", "companyId"] },
  relations: {
    Company: {},
    Customer: {
      company: { cardinality: "belongsTo", target: "Company", foreignKey: "companyId", optional: true },
    },
  },
} as const satisfies OntologyRuntime<Ontology>;

const frontal = createFrontalClient<Ontology>(
  { apiKey: process.env.FRONTAL_API_KEY! },
  runtime
);
```

```ts
const customer = await frontal.ontology.Customer.get("cust_1");
customer.email; // string
customer.status; // "active" | "closed"

// Relations load on demand. Each call fetches the target; nothing is cached.
const company = await customer.company(); // Company | null
```

### Relations

| Cardinality | Accessor | Resolved through |
| --- | --- | --- |
| `belongsTo` | `Promise<Entity>` or `Promise<Entity \| null>` when optional | the foreign key on the record |
| `hasOne` | `Promise<Entity \| null>` | relationship instances; more than one is `TOO_MANY_RELATIONSHIPS` |
| `hasMany` | `Promise<Entity[]>` | relationship instances, in backend order |
| `manyToMany` | `Promise<Entity[]>` | relationship instances, in backend order |

`hasOne`, `hasMany` and `manyToMany` need a `relationshipTypeId` in the object
type's schema. Targets are fetched with bounded concurrency (8 at a time).

### Query, list and writes

```ts
// Query: one page of matches. Operators depend on the field's type: strings
// take eq, in, contains and startsWith; numbers take eq, in, gt, gte, lt and
// lte; booleans take eq; enums take eq and in with their declared values.
const page = await frontal.ontology.Customer.query({
  where: { status: { eq: "active" } },
  limit: 100, // 1 to 500, default 50
});
page.items; // Customer[]
page.nextCursor; // pass as `cursor` for the next page, or null on the last

// List: every object of the type, following the pages of query until the last.
const customers = await frontal.ontology.Customer.list();

// Create: the server generates the id.
const created = await frontal.ontology.Customer.create({ email: "a@example.com" });

// Put: write the whole object under an id you choose. Every writable field
// must be given, because the stored object is replaced.
await frontal.ontology.Customer.put("cust_2", { email: "b@example.com" });

// Update: changes only the given writable fields.
await frontal.ontology.Customer.update("cust_1", { status: "closed" });

await frontal.ontology.Customer.delete("cust_1");
```

`update` reads the object with its `ETag`, merges the writable fields, and
writes with `If-Match`. If another write got in first, it re-reads and tries
again, up to three attempts in total; after that it throws a `ConflictError`
with code `PRECONDITION_FAILED`. An update is never lost silently, and it is
never written without an `ETag`.

### Errors

- A response that does not match the ontology throws a `ValidationError` with
  code `INVALID_RESPONSE`. Its `fields` lists each problem, such as a missing
  required field or a value outside an enum.
- An input with an unknown or read-only field throws a `ValidationError` with
  code `INVALID_INPUT`, before any request is sent.
- A query with an unknown field, an operator its type does not allow, a value
  of the wrong type, or a page size outside 1 to 500 throws a `ValidationError`
  before any request. A rejection from the server keeps its code
  (`UNKNOWN_PROPERTY`, `INVALID_OPERATOR`, `INVALID_CURSOR`).
- Reading an entity that the ontology does not define throws a `TypeError`
  that lists the known entities.

### Object model

Each entity maps to one backend object type (`objectTypeIds` in the runtime
metadata). A stored object carries its fields under `properties`; the typed
entity exposes them at the top level, with `id` set to the object id. A record
that belongs to another object type is rejected with `INVALID_RESPONSE`.

### Backend requirements

`query`, `list`, conditional `update` and the `hasOne`, `hasMany` and
`manyToMany` traversals use the ontology contract v2: the query endpoint,
`If-Match` on object writes, and the relationship instance endpoints. A backend
that does not serve them rejects those calls with its own errors. `get`,
`create`, `put`, `delete` and `belongsTo` use only the published contract.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
