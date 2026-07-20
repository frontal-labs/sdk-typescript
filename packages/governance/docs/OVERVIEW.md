# Governance SDK Overview

The `@frontal-labs/governance` package provides a TypeScript/JavaScript client for Frontal's Policy management, RBAC, and data classification.

## Installation

```bash
bun add @frontal-labs/governance
# or
npm install @frontal-labs/governance
```

## Quick Start

```typescript
import { createGovernanceClient } from "@frontal-labs/governance";

const client = createGovernanceClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Use the client...
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTAL_API_KEY` | Yes | — | Your Frontal API key |
| `FRONTAL_GOVERNANCE_API_URL` | No | `https://api.frontal.dev/v1` | Custom API base URL |
| `NODE_ENV` | No | `development` | Runtime environment |

## Core Concepts

The Governance SDK follows the composition-over-inheritance pattern used across all Frontal SDKs. The service class accepts an `HttpClient` from `frontal/core` for transport, uses Zod schemas for runtime validation, and provides both a standalone factory function (`createGovernanceClient`) and a default singleton (`governance`).

## Configuration

### Standalone Client

```typescript
import { createGovernanceClient } from "@frontal-labs/governance";

const client = createGovernanceClient({
  apiKey: "frt_...",
  baseUrl: "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3
});
```

### Shared FrontalClient (recommended)

```typescript
import { FrontalClient } from "frontal/core";
import { createGovernanceClient } from "@frontal-labs/governance";

const frontal = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const client = createGovernanceClient(frontal);
```

## Use Cases

1. Policy management
2. RBAC
3. and data classification

## Error Handling

The Governance SDK throws typed errors from `frontal/core`:

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
- [@frontal-labs/auth](../auth/docs/OVERVIEW.md)
- [@frontal-labs/audit](../audit/docs/OVERVIEW.md)
