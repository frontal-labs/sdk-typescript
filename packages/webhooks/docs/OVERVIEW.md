# Webhooks SDK Overview

The `@frontal-labs/webhooks` package provides a TypeScript/JavaScript client for Frontal's Webhook endpoint management and delivery tracking.

## Installation

```bash
bun add @frontal-labs/webhooks
# or
npm install @frontal-labs/webhooks
```

## Quick Start

```typescript
import { createWebhooksClient } from "@frontal-labs/webhooks";

const client = createWebhooksClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_WEBHOOKS_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Webhooks SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `frontal/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createWebhooksClient`) and a default singleton (`webhooks`).

## Configuration

### Standalone Client

```typescript
import { createWebhooksClient } from "@frontal-labs/webhooks";

const client = createWebhooksClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "frontal/core";
import { createWebhooksClient } from "@frontal-labs/webhooks";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createWebhooksClient(frontal);
```

## Use Cases

1. Webhook endpoint management and delivery tracking

## Error Handling

The Webhooks SDK throws typed errors from `frontal/core`:

```typescript
import { FrontalError, RateLimitError, NotFoundError } from "frontal/core";

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

- [frontal/core](../core/docs/OVERVIEW.md)
- [@frontal-labs/events](../events/docs/OVERVIEW.md)
