# Datasets SDK Overview

The `@frontal-labs/datasets` package provides a TypeScript/JavaScript client for Frontal's Dataset CRUD, versioning, and data operations.

## Installation

```bash
bun add @frontal-labs/datasets
# or
npm install @frontal-labs/datasets
```

## Quick Start

```typescript
import { createDatasetsClient } from "@frontal-labs/datasets";

const client = createDatasetsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_DATASETS_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Datasets SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/_core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createDatasetsClient`) and a default singleton (`datasets`).

## Configuration

### Standalone Client

```typescript
import { createDatasetsClient } from "@frontal-labs/datasets";

const client = createDatasetsClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/_core";
import { createDatasetsClient } from "@frontal-labs/datasets";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createDatasetsClient(frontal);
```

## Use Cases

1. Dataset CRUD
2. versioning
3. and data operations

## Error Handling

The Datasets SDK throws typed errors from `@frontal-labs/_core`:

```typescript
import { FrontalError, RateLimitError, NotFoundError } from "@frontal-labs/_core";

try {
  await client.someMethod();
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error("Resource not found:", error.message);
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited — retry after", error.retryAfter, "s");
  } else if (error instanceof FrontalError) {
    console.error("API error:", error.code, error.statusCode);
  }
}
```

## Related Packages

- [@frontal-labs/_core](../core/docs/OVERVIEW.md)
- [@frontal-labs/lineage](../lineage/docs/OVERVIEW.md)
