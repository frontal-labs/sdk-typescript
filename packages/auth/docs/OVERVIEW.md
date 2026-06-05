# Auth SDK Overview

The `@frontal-labs/auth` package provides a TypeScript/JavaScript client for Frontal's Authentication & Authorization (GoTrue-compatible).

## Installation

```bash
bun add @frontal-labs/auth
# or
npm install @frontal-labs/auth
```

## Quick Start

```typescript
import { createAuthClient } from "@frontal-labs/auth";

const client = createAuthClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_AUTH_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Auth SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createAuthClient`) and a default singleton (`auth`).

## Configuration

### Standalone Client

```typescript
import { createAuthClient } from "@frontal-labs/auth";

const client = createAuthClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createAuthClient } from "@frontal-labs/auth";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createAuthClient(frontal);
```

## Use Cases

1. Authentication & Authorization (GoTrue-compatible)

## Error Handling

The Auth SDK throws typed errors from `@frontal-labs/core`:

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
- [@frontal-labs/organization](../organization/docs/OVERVIEW.md)
- [@frontal-labs/governance](../governance/docs/OVERVIEW.md)
