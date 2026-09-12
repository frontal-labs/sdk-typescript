# @frontal-labs/observability

Logs, metrics, traces, alerts and dashboards — query and ingest.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.observability`. To install only this
package: `bun add @frontal-labs/observability`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const logs = await f.observability.logs.query({
  query: 'level:error AND service:"agents"',
  timeFrom: "2025-01-01T00:00:00Z",
  timeTo: "2025-01-02T00:00:00Z",
  limit: 50,
});
console.log(logs.data.length);
```

## Usage

### Standalone client

```ts
import { createObservabilityClient } from "@frontal-labs/observability";

const observability = createObservabilityClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createObservabilityClient } from "@frontal-labs/observability";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const observability = createObservabilityClient(client);
```

### Correlate by requestId

```ts
import { FrontalError } from "@frontal-labs/core";

try {
  await f.ai.generateText({ model: "claude-sonnet-4-6", prompt: "hi" });
} catch (err) {
  if (err instanceof FrontalError) {
    const logs = await f.observability.logs.query({
      query: `requestId:"${err.requestId}"`,
      timeFrom: "2025-01-01T00:00:00Z",
      timeTo: "2025-01-02T00:00:00Z",
    });
    console.log(logs.data);
  }
}
```

### One-line telemetry for every SDK call

`registerTelemetry` gives every request a span (OpenTelemetry-compatible) and
optional hooks; `requestIdOf()` reads the id off any response so you can join
it with logs, traces and lineage.

```ts
import { registerTelemetry, requestIdOf } from "@frontal-labs/sdk";

registerTelemetry({
  // tracer: otel.trace.getTracer("my-app"),   // optional OTel tracer
  onError: (e) => console.error(e.method, e.path, e.requestId, e.error),
  onResponse: (e) => console.log(`${e.method} ${e.path} ${e.status} ${e.durationMs}ms`),
});

const agent = await f.agents.use("agt_1").get();
const rid = requestIdOf(agent);
if (rid) {
  const logs = await f.observability.logs.query({
    query: `requestId:"${rid}"`,
    timeFrom: "2025-01-01T00:00:00Z",
    timeTo: "2025-01-02T00:00:00Z",
  });
  console.log(logs.data.length);
}
```

### Fetch a trace

```ts
const trace = await f.observability.traces.get("trc_123");
console.log(trace);
```
## Error handling

All failures throw a typed `FrontalError` subclass (`NotFoundError`,
`ValidationError`, `RateLimitError`, ...) carrying `code`, `requestId` and
`statusCode`. See [`@frontal-labs/core`](../core/README.md#error-handling).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API key (`frt_...`) |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
