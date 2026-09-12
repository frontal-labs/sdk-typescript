# @frontal-labs/workers

Deploy and invoke edge workers.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.workers`. To install only this
package: `bun add @frontal-labs/workers`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

await f.workers.deploy({
  name: "hello",
  code: "export default { fetch: () => new Response('hi') }",
});

const res = await f.workers.invoke("hello", { path: "/", method: "GET" });
console.log(await res.text());
```

## Usage

### Standalone client

```ts
import { createWorkersClient } from "@frontal-labs/workers";

const workers = createWorkersClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createWorkersClient } from "@frontal-labs/workers";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const workers = createWorkersClient(client);
```

### Invoke with a JSON body

```ts
const echo = await f.workers.invoke("hello", {
  method: "POST",
  path: "/echo",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ping: true }),
});
console.log(echo.status, await echo.json());
```
`invoke()` returns the raw `Response` so you control how the body is read.

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
