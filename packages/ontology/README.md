# @frontal-labs/ontology

Client for the Frontal Ontology platform (`/v1/ontology/*`). The API is composed
of independent subdomain services, each exposed as a namespace:
`engine`, `objects`, `relationships`, `schemas`, `versions`, `validation`,
`transformations`, `reasoning`, `rollouts`, `rollups`, `extract`, and `events`.
(The `graph` subdomain is served by `@frontal-labs/graph`.)

## Installation

```bash
npm install @frontal-labs/ontology
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { ontology } from "@frontal-labs/ontology";

// Generate an ontology with the engine, then browse object types.
const proposal = await ontology.engine.generate({
  description: "Model a billing dispute lifecycle with SLA states.",
});
const objectTypes = await ontology.objects.listObjectTypes({ limit: 10 });
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
await ontology.rollouts.start(rollout.id);
const status = await ontology.rollouts.status(rollout.id);
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_ONTOLOGY_API_URL` | `https://api.frontal.dev/v1` |
