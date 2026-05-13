# @frontal/ontology

Ontology and model management APIs for schema, rules, and migrations.

## Installation

```bash
bun add @frontal/ontology @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createOntologyClient } from "@frontal/ontology";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const ontology = createOntologyClient(client);

const models = await ontology.list({ limit: 10 });
await ontology.create({ name: "invoice", fields: [{ name: "amount", type: "number", required: true }] });
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_ONTOLOGY_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)
