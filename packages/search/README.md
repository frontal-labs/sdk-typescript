# @frontal-labs/search

Unified search SDK composing vector, semantic, and structured search with hybrid mode.

## Installation

```bash
bun add @frontal-labs/search @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createSearchClient } from "@frontal-labs/search";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const search = createSearchClient(client);

const results = await search.search({
  query: "red shoes",
  modes: ["vector", "semantic"],
  top_k: 10,
});

const hybrid = await search.hybridSearch({
  query: "customers in us-east",
  entity_types: ["customer"],
  top_k: 5,
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_SEARCH_API_URL` — Custom search API base URL
