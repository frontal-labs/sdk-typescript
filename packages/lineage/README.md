# @frontal-labs/lineage

Data lineage — traverse the lineage graph, inspect nodes and edges, and analyze the impact of a change before you make it.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.lineage`. To install only this
package: `bun add @frontal-labs/lineage`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const graph = await f.lineage.graph.get("ds_orders", { depth: 2 });
console.log(graph.nodes.length, graph.edges.length);
```

## Usage

### Standalone client

```ts
import { createLineageClient } from "@frontal-labs/lineage";

const lineage = createLineageClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createLineageClient } from "@frontal-labs/lineage";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const lineage = createLineageClient(client);
```

### Trace a node upstream

```ts
const trace = await f.lineage.nodes.trace("ds_orders");
console.log(trace.nodes.map((n) => n.id));
```

### Impact analysis

```ts
const impact = await f.lineage.impact.analyzeChange("ds_orders", {
  field: "customer_id",
  type: "update",
});
for (const r of impact.affectedResources) console.log(r.name, r.impact);
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
