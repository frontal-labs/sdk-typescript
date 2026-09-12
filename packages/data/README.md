# @frontal-labs/data

Data platform sub-domains — aggregations, archival, enrichment, exports, normalization, quality, serving, streams, sync, transformations, federated query and schema registry — behind one client.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.data`. To install only this
package: `bun add @frontal-labs/data`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const jobs = await f.data.transformations.list({ limit: 10 });
console.log(jobs.data.length);
```

## Usage

### Standalone client

```ts
import { createDataClient } from "@frontal-labs/data";

const data = createDataClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createDataClient } from "@frontal-labs/data";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const data = createDataClient(client);
```

### Run a federated query

```ts
const result = await f.data.query.federated({
  sql: "SELECT count(*) FROM acme.crm.contacts",
});
console.log(result);
```

### Create and execute an aggregation

```ts
const agg = await f.data.aggregations.create({
  name: "daily-revenue",
  source: "acme.billing.invoices",
  groupBy: ["day"],
});
const run = await f.data.aggregations.execute(agg.id as string);
console.log(run);
```

### Sub-domain health

```ts
const health = await f.data.quality.health();
console.log(health);
```
Every sub-domain namespace exposes `capabilities()`, `health()`, `info()`,
`runs()`, `createRun()` and `run(id)` in addition to its resource methods.

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
