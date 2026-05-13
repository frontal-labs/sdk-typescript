# @frontal/graph

Graph entities, relationships, query, and traversal APIs.

## Installation

```bash
bun add @frontal/graph @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createGraphClient } from "@frontal/graph";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const graph = createGraphClient(client);

const users = await graph.query({ entityType: "user", limit: 10 });
const user = await graph.use("user").create({ email: "a@frontal.dev" });
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_GRAPH_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)
