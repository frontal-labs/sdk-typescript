# @frontal-labs/datasets

Dataset management SDK with versioning, data operations, and statistics.

## Installation

```bash
bun add @frontal-labs/datasets @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
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

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_DATASETS_API_URL` — Custom datasets API base URL
