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
    relations: { company: { target: "Company"; optional: true } };
  };
}

// `.frontal/client.ts` passes this runtime metadata (generated).
const runtime = {
  entities: ["Company", "Customer"],
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
    Customer: { company: { target: "Company", foreignKey: "companyId", optional: true } },
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

// Relations load on demand. Optional relations resolve to null when empty.
const company = await customer.company(); // Company | null
```

### Writes

```ts
// Create: the id is generated client-side.
const created = await frontal.ontology.Customer.create({ email: "a@example.com" });

// Put: choose the id.
await frontal.ontology.Customer.put("cust_2", { email: "b@example.com" });

// Update: changes only the given writable fields.
await frontal.ontology.Customer.update("cust_1", { status: "closed" });

await frontal.ontology.Customer.delete("cust_1");
```

`update` is a GET, a merge of the writable fields, then a PUT. It is **not
atomic**: a concurrent write between the GET and the PUT can be lost.

### Errors

- A response that does not match the ontology throws a `ValidationError` with
  code `INVALID_RESPONSE`. Its `fields` lists each problem, such as a missing
  required field or a value outside an enum.
- An input with an unknown or read-only field throws a `ValidationError` with
  code `INVALID_INPUT`, before any request is sent.
- Reading an entity that the ontology does not define throws a `TypeError`
  that lists the known entities.

### Current limits

- There is no `list` or `query`: the objects API has no type filter and no
  documented query body. Use `frontal.ontology.objects` for raw access.
- `hasMany` and `manyToMany` relations are not generated.
- Records are assumed to be flat, with object-type fields at the top level, and
  foreign keys are assumed to live on the source record.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
