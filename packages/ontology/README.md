# @frontal-labs/ontology

Ontology and model management — schema definition, validation, migrations,
rules, and AI-powered inference.

## Installation

```bash
npm install @frontal-labs/ontology
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { ontology } from "@frontal-labs/ontology";

const models = await ontology.list({ limit: 10 });
```

The `ontology` singleton reads `FRONTAL_API_KEY` and
`FRONTAL_ONTOLOGY_API_URL` from the environment.

## Usage

### Explicit config

```ts
import { createOntologyClient } from "@frontal-labs/ontology";

const ontology = createOntologyClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

await ontology.create({
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

### Validate a model

```ts
await ontology.validate({
  name: "Incident",
  fields: [{ name: "severity", type: "string" }],
});
```

### AI-powered generation

```ts
const proposal = await ontology.generation.generate(
  "Model a billing dispute lifecycle with ownership and SLA states.",
  { substrates: ["billing", "support"] }
);
```

### Migrations

```ts
const migrations = await ontology.migrations.list({ model: "Invoice" });
await ontology.migrations.apply("Invoice", { targetVersion: "v2" });
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_ONTOLOGY_API_URL` | `https://api.frontal.dev/v1` |
