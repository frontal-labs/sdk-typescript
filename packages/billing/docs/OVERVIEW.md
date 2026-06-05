# Billing SDK Overview

The `@frontal-labs/billing` package provides a TypeScript/JavaScript client for Frontal's Plans, subscriptions, invoices, and usage metering.

## Installation

```bash
bun add @frontal-labs/billing
# or
npm install @frontal-labs/billing
```

## Quick Start

```typescript
import { createBillingClient } from "@frontal-labs/billing";

const client = createBillingClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_BILLING_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Billing SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createBillingClient`) and a default singleton (`billing`).

## Configuration

### Standalone Client

```typescript
import { createBillingClient } from "@frontal-labs/billing";

const client = createBillingClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/core";
import { createBillingClient } from "@frontal-labs/billing";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createBillingClient(frontal);
```

## Use Cases

1. Plans
2. subscriptions
3. invoices
4. and usage metering

## Error Handling

The Billing SDK throws typed errors from `@frontal-labs/core`:

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
