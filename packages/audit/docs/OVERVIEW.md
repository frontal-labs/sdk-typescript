# Audit SDK Overview

The `@frontal-labs/audit` package provides a TypeScript/JavaScript client for Frontal's Audit trails, compliance checks, and reports.

## Installation

```bash
bun add @frontal-labs/audit
# or
npm install @frontal-labs/audit
```

## Quick Start

```typescript
import { createAuditClient } from "@frontal-labs/audit";

const client = createAuditClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_AUDIT_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Audit SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `@frontal-labs/_core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createAuditClient`) and a default singleton (`audit`).

## Configuration

### Standalone Client

```typescript
import { createAuditClient } from "@frontal-labs/audit";

const client = createAuditClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "@frontal-labs/_core";
import { createAuditClient } from "@frontal-labs/audit";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createAuditClient(frontal);
```

## Use Cases

1. Audit trails
2. compliance checks
3. and reports

## Error Handling

The Audit SDK throws typed errors from `@frontal-labs/_core`:

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
- [@frontal-labs/auth](../auth/docs/OVERVIEW.md)
- [@frontal-labs/governance](../governance/docs/OVERVIEW.md)
