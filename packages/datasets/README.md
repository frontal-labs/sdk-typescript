# @frontal-labs/datasets

Dataset management SDK with versioning, data operations, and statistics.

## Installation

```bash
bun add @frontal-labs/datasets @frontal-labs/_core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/_core";
import { createDatasetsClient } from "@frontal-labs/datasets";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const datasets = createDatasetsClient(client);

// Submit an ingestion request
const run = await datasets.ingest({
  dataset: "user_events",
  source: "events-topic",
});

// List and read datasets from the ingest service
const page = await datasets.list({ limit: 20 });
const ds = await datasets.get("user_events");

// Browse the catalog
const catalog = await datasets.catalog.datasets.list();
const sources = await datasets.catalog.sources.list();
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
