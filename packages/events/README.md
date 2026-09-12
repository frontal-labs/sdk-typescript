# @frontal-labs/events

Event bus — topics, subscriptions, schemas, publish/subscribe and replays.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.events`. To install only this
package: `bun add @frontal-labs/events`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

await f.events.publish("orders", [
  { source: "checkout", type: "order.created", data: { orderId: "ord_1" } },
]);
```

## Usage

### Standalone client

```ts
import { createEventsClient } from "@frontal-labs/events";

const events = createEventsClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createEventsClient } from "@frontal-labs/events";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const events = createEventsClient(client);
```

### Topics and subscriptions

```ts
const topic = await f.events.topics.create({ name: "orders" });
const sub = await f.events.subscriptions.create({
  topic: topic.name,
  endpoint: "https://example.com/events",
});
console.log(sub.id);
```

### Validate against a schema

```ts
const ok = await f.events.schemas.validate("order.created", {
  orderId: "ord_1",
});
console.log(ok);
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
