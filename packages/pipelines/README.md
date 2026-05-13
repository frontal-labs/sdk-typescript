# @frontal/pipelines

Declarative pipeline SDK for ingest, transform, and execution workflows.

## Installation

```bash
bun add @frontal/pipelines @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createPipelinesClient } from "@frontal/pipelines";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const pipelines = createPipelinesClient(client);

const page = await pipelines.list({ limit: 10 });
const run = await pipelines.use("ppl_123").trigger({ source: "manual" });
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_PIPELINES_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)
