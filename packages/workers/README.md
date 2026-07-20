# @frontal-labs/workers

Client for **Frontal Workers** — the serverless edge runtime (`/v1/workers`).
Deploy a worker from source, then invoke it by path.

> Renamed from `@frontal-labs/functions`. The backend service is the Frontal
> edge runtime and refers to these as **workers**.

## Installation

```bash
npm install @frontal-labs/workers
```

## Quick Start

```ts
import { workers } from "@frontal-labs/workers";

// Deploy a worker from source.
await workers.deploy({
  name: "hello",
  code: "export default () => new Response('hello from the edge')",
  envVars: { GREETING: "hi" },
});

// Invoke it (returns the raw Response).
const res = await workers.invoke("hello", { path: "/", method: "GET" });
console.log(await res.text());
```

## Configuration

- `FRONTAL_API_KEY` — your Frontal API key
- `FRONTAL_WORKERS_API_URL` — optional override for the workers API base URL
