# @frontal-labs/webhooks

Webhook endpoint SDK with delivery tracking, retry, secret rotation, and HMAC signature verification.

## Installation

```bash
bun add @frontal-labs/webhooks @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createWebhooksClient } from "@frontal-labs/webhooks";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const webhooks = createWebhooksClient(client);

const endpoint = await webhooks.endpoints.create({
  url: "https://hooks.example.com/events",
  events: ["order.created", "payment.completed"],
});

const stats = await webhooks.stats.getStats({
  webhook_id: endpoint.id,
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_WEBHOOKS_API_URL` — Custom webhooks API base URL
