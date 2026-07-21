# Lineage SDK Overview

The `@frontal-labs/lineage` package provides a TypeScript/JavaScript client for Frontal's Data lineage graphs and impact analysis.

## Installation

```bash
bun add @frontal-labs/lineage
# or
npm install @frontal-labs/lineage
```

## Quick Start

```typescript
import { createLineageClient } from "@frontal-labs/lineage";

const client = createLineageClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_LINEAGE_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Lineage SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createLineageClient`) and a default singleton (`lineage`).

## Configuration

### Standalone Client

```typescript
import { createLineageClient } from "@frontal-labs/lineage";

const client = createLineageClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createLineageClient } from "@frontal-labs/lineage";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createLineageClient(frontal);
```

## Use Cases

1. Data lineage graphs and impact analysis

## Error Handling

The Lineage SDK throws typed errors from `@frontal-labs/core`:

```typescript
import { FrontalError, RateLimitError, NotFoundError } from "@frontal-labs/core";

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

- [@frontal-labs/core](../core/docs/OVERVIEW.md)
- [@frontal-labs/datasets](../datasets/docs/OVERVIEW.md)
- [@frontal-labs/pipelines](../pipelines/docs/OVERVIEW.md)
