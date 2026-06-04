# @frontal-labs/graph

Graph entities, relationships, query, traversal, time travel, and semantic
search.

## Installation

```bash
npm install @frontal-labs/graph
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { graph } from "@frontal-labs/graph";

const users = await graph.query({ entityType: "user", limit: 10 });
```

The `graph` singleton reads `FRONTAL_API_KEY` and `FRONTAL_GRAPH_API_URL`
from the environment.

## Usage

### Explicit config

```ts
import { createGraphClient } from "@frontal-labs/graph";

const graph = createGraphClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const customer = await graph.use("customer").create({
  email: "a@frontal.dev",
  name: "Acme Corp",
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createGraphClient } from "@frontal-labs/graph";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const graph = createGraphClient(client);
```

### Entity CRUD

```ts
// Create
const entity = await graph.use("customer").create({ name: "Acme" });

// Read
const customer = await graph.use("customer").get(entity.id);

// Update
await graph.use("customer").update(entity.id, { name: "Acme Corp" });

// Delete
await graph.use("customer").delete(entity.id);

// List
const page = await graph.use("customer").list({ limit: 25 });
```

### Relationships

```ts
await graph.use("customer").addRelationship(
  "cust_123", "ticket_456", "opened_ticket", { weight: 1 }
);

const related = await graph.use("customer").getRelationships("cust_123");
```

### Semantic search

```ts
const results = await graph.search({
  entityType: "document",
  query: "quarterly revenue reports",
  limit: 5,
});
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_GRAPH_API_URL` | `https://api.frontal.dev/v1` |
