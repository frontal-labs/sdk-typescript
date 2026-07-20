# @frontal-labs/_core

Shared runtime for all Frontal TypeScript SDKs — HTTP client, auth, retries,
pagination, polling, and typed errors.

## Installation

```bash
npm install @frontal-labs/_core
```

## Quick Start

```ts
import { FrontalClient } from "@frontal-labs/_core";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const data = await client.get("/health");
```

## API

### FrontalClient

```ts
const client = new FrontalClient({
  apiKey: "frt_...",          // required
  baseUrl: "https://...",     // defaults to https://api.frontal.dev/v1
  timeout: 30_000,            // request timeout in ms
  maxRetries: 3,              // max retry attempts on transient errors
  retryDelay: 1_000,          // delay between retries in ms
  headers: {},                // extra headers sent with every request
  environment: "production",  // "development" | "test" | "production"
  debug: false,               // enable debug logging
});
```

Methods: `get`, `post`, `put`, `patch`, `delete`, `getRaw`, `postRaw`,
`putRaw`, `postFormData`, `stream`, `postStream`.

### Error Handling

```ts
import { FrontalError } from "@frontal-labs/_core";

try {
  await client.get("/something");
} catch (e) {
  if (e instanceof FrontalError) {
    console.error(e.code, e.statusCode, e.requestId);
  }
}
```

### Polling

```ts
import { pollUntil } from "@frontal-labs/_core";

const result = await pollUntil(
  () => client.get<{ status: string }>("/jobs", { id }),
  { interval: 2_000, timeout: 120_000, until: (r) => r.status === "completed" }
);
```

### Pagination

```ts
import { createPageResult } from "@frontal-labs/_core";

const page = createPageResult({ items: [...], total: 100, limit: 10, offset: 0 });
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |

The `FRONTAL_API_KEY` and `FRONTAL_API_URL` variables are read automatically by `getDefaultClient()`.
