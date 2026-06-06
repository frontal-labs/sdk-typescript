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

const ds = await datasets.datasets.create({
  name: "user_events",
  description: "User interaction events",
});

await datasets.data.insert(ds.id, [
  { user_id: "usr_1", event: "page_view" },
]);

const results = await datasets.data.query(ds.id, {
  where: { event: "page_view" },
  limit: 10,
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_DATASETS_API_URL` — Custom datasets API base URL
