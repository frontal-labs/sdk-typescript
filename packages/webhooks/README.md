# @frontal-labs/webhooks

Webhook endpoint SDK with delivery tracking, retry, secret rotation, and HMAC signature verification.

## Installation

```bash
bun add @frontal-labs/webhooks @frontal-labs/_core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/_core";
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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
