# @frontal/core

Shared runtime for all Frontal TypeScript SDKs.

## Installation

```bash
bun add @frontal/core
```

## Provides

- `FrontalClient`
- `HttpClient`
- typed API errors
- retry/polling utilities
- pagination helpers

## Usage

```ts
import { FrontalClient } from "@frontal/core";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  headers: {},
  environment: "production",
  debug: false,
});

const health = await client.get("/health");
```
