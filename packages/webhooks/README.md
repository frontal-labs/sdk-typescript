# @frontal-labs/webhooks

Outbound webhooks — register endpoints, inspect and retry deliveries, rotate secrets, and read delivery stats.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.webhooks`. To install only this
package: `bun add @frontal-labs/webhooks`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const endpoint = await f.webhooks.endpoints.create({
  url: "https://example.com/hooks/frontal",
  events: ["agent.run.completed", "workflow.approval.requested"],
});
console.log(endpoint.id);
```

## Usage

### Standalone client

```ts
import { createWebhooksClient } from "@frontal-labs/webhooks";

const webhooks = createWebhooksClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createWebhooksClient } from "@frontal-labs/webhooks";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const webhooks = createWebhooksClient(client);
```

### Inspect and retry deliveries

```ts
const deliveries = await f.webhooks.deliveries.list({ webhookId: "wh_1" });
for (const d of deliveries.data) {
  if (d.status === "failed") await f.webhooks.deliveries.retry(d.id);
}
```

### Rotate a signing secret

```ts
const { secret } = await f.webhooks.endpoints.rotateSecret("wh_1");
console.log(secret);
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
