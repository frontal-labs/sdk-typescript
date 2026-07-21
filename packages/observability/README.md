# @frontal-labs/observability

Observability SDK for logs, metrics, traces, alerts, and dashboards.

## Installation

```bash
bun add @frontal-labs/observability @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createObservabilityClient } from "@frontal-labs/observability";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const obs = createObservabilityClient(client);

const logs = await obs.logs.query({
  query: "level:error",
  time_from: "2025-01-01T00:00:00Z",
  time_to: "2025-01-02T00:00:00Z",
});

const metrics = await obs.metrics.query("cpu_usage", {
  from: "2025-01-01T00:00:00Z",
  to: "2025-01-02T00:00:00Z",
  granularity: "1m",
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
