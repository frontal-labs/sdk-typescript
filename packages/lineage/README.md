# @frontal-labs/lineage

Data lineage SDK for graph retrieval, node tracing, and impact analysis.

## Installation

```bash
bun add @frontal-labs/lineage @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createLineageClient } from "@frontal-labs/lineage";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const lineage = createLineageClient(client);

const graph = await lineage.graph.get("ds_sales", { depth: 3 });

const trace = await lineage.nodes.trace("ds_sales");

const impact = await lineage.impact.analyzeChange("ds_sales", {
  type: "update",
  field: "amount",
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_LINEAGE_API_URL` — Custom lineage API base URL
