# @frontal-labs/vectors

Vector embeddings SDK for index management, similarity/hybrid search, and AI integration.

## Installation

```bash
bun add @frontal-labs/vectors @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createVectorsClient } from "@frontal-labs/vectors";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const vectors = createVectorsClient(client);

const index = await vectors.indexes.create({
  name: "products",
  dimensions: 1536,
  metric: "cosine",
});

await vectors.vectors.upsert(index.id, [{
  id: "prod_1",
  values: [0.1, 0.2, /* ... */],
}]);

const results = await vectors.search.search(index.id, {
  vector: [0.1, 0.2, /* ... */],
  top_k: 5,
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_VECTORS_API_URL` — Custom vectors API base URL
