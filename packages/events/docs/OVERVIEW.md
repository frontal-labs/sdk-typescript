# Events SDK Overview

The `@frontal-labs/events` package provides a TypeScript/JavaScript client for Frontal's Event bus, pub/sub, dead-letter queues.

## Installation

```bash
bun add @frontal-labs/events
# or
npm install @frontal-labs/events
```

## Quick Start

```typescript
import { createEventsClient } from "@frontal-labs/events";

const client = createEventsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_EVENTS_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Events SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createEventsClient`) and a default singleton (`events`).

## Configuration

### Standalone Client

```typescript
import { createEventsClient } from "@frontal-labs/events";

const client = createEventsClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createEventsClient } from "@frontal-labs/events";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createEventsClient(frontal);
```

## Use Cases

1. Event bus
2. pub/sub
3. dead-letter queues

## Error Handling

The Events SDK throws typed errors from `@frontal-labs/core`:

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
- [@frontal-labs/webhooks](../webhooks/docs/OVERVIEW.md)
- [@frontal-labs/observability](../observability/docs/OVERVIEW.md)
