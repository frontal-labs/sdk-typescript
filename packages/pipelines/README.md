# @frontal-labs/pipelines

Declarative data pipeline SDK — ingest, transform, enrich, validate, and
orchestrate with substrate awareness.

## Installation

```bash
npm install @frontal-labs/pipelines
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const pipelines = f.pipelines;

const list = await pipelines.list({ limit: 10 });
```


## Usage

### Explicit config

```ts
import { createPipelinesClient } from "@frontal-labs/pipelines";

const pipelines = createPipelinesClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const run = await pipelines.use("ppl_123").trigger({ source: "manual" });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createPipelinesClient } from "@frontal-labs/pipelines";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const pipelines = createPipelinesClient(client);
```

### Builder API

```ts
const pipeline = await pipelines
  .define("crm-sync")
  .fromSchedule("0 * * * *")
  .collect("fetch-crm", { source: "salesforce" })
  .transform("normalize", { mapping: { company_name: "companyName" } })
  .write("upsert-graph", { target: "graph" })
  .create();

await pipelines.use(pipeline.id).trigger({ dryRun: false });
```

### Backfills and lineage

```ts
const backfill = await pipelines.use("ppl_123").backfill(
  "2026-01-01",
  "2026-06-01",
  { strategy: "incremental" }
);

const health = await pipelines.use("ppl_123").health();
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
