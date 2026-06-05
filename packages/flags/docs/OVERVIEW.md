# Flags SDK Overview

The `@frontal-labs/flags` package provides a TypeScript/JavaScript client for Frontal's Feature flags, targeting, rollouts, and experiments.

## Installation

```bash
bun add @frontal-labs/flags
# or
npm install @frontal-labs/flags
```

## Quick Start

```typescript
import { createFlagsClient } from "@frontal-labs/flags";

const client = createFlagsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_FLAGS_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Flags SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createFlagsClient`) and a default singleton (`flags`).

## Configuration

### Standalone Client

```typescript
import { createFlagsClient } from "@frontal-labs/flags";

const client = createFlagsClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createFlagsClient } from "@frontal-labs/flags";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createFlagsClient(frontal);
```

## Use Cases

1. Feature flags
2. targeting
3. rollouts
4. and experiments

## Error Handling

The Flags SDK throws typed errors from `@frontal-labs/core`:

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
- [@frontal-labs/audit](../audit/docs/OVERVIEW.md)
