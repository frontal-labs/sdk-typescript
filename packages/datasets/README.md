# @frontal-labs/datasets

Dataset catalog — list datasets, read artifacts, browse schemas and sources, and ingest data.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.datasets`. To install only this
package: `bun add @frontal-labs/datasets`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const page = await f.datasets.list({ limit: 20 });
for (const ds of page.data) console.log(ds.id);
```

## Usage

### Standalone client

```ts
import { createDatasetsClient } from "@frontal-labs/datasets";

const datasets = createDatasetsClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createDatasetsClient } from "@frontal-labs/datasets";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const datasets = createDatasetsClient(client);
```

### Ingest a record

```ts
const { runId } = await f.datasets.ingest({
  dataset: "acme.crm.contacts",
  payload: { email: "a@example.com", name: "Ada" },
});
console.log(runId);
```

### Browse the catalog

```ts
const sources = await f.datasets.catalog.sources.list({ limit: 10 });
const schema = await f.datasets.schemas.get("acme.crm.contacts@v1");
console.log(sources.data, schema);
```
## Error handling

All failures throw a typed `FrontalError` subclass (`NotFoundError`,
`ValidationError`, `RateLimitError`, ...) carrying `code`, `requestId` and
`statusCode`. See [`@frontal-labs/core`](../core/README.md#error-handling).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API key (`frt_...`) |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
