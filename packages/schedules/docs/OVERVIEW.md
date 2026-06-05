# Schedules SDK Overview

The `@frontal-labs/schedules` package provides a TypeScript/JavaScript client for Frontal's Cron-based scheduling for pipelines and workflows.

## Installation

```bash
bun add @frontal-labs/schedules
# or
npm install @frontal-labs/schedules
```

## Quick Start

```typescript
import { createSchedulesClient } from "@frontal-labs/schedules";

const client = createSchedulesClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_SCHEDULES_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Schedules SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createSchedulesClient`) and a default singleton (`schedules`).

## Configuration

### Standalone Client

```typescript
import { createSchedulesClient } from "@frontal-labs/schedules";

const client = createSchedulesClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createSchedulesClient } from "@frontal-labs/schedules";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createSchedulesClient(frontal);
```

## Use Cases

1. Cron-based scheduling for pipelines and workflows

## Error Handling

The Schedules SDK throws typed errors from `@frontal-labs/core`:

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
- [@frontal-labs/queues](../queues/docs/OVERVIEW.md)
- [@frontal-labs/pipelines](../pipelines/docs/OVERVIEW.md)
- [@frontal-labs/workflows](../workflows/docs/OVERVIEW.md)
