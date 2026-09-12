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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
