# @frontal-labs/events

Event bus and pub/sub SDK with topic management, subscriptions, and dead-letter queues.

## Installation

```bash
bun add @frontal-labs/events @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createEventsClient } from "@frontal-labs/events";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const events = createEventsClient(client);

const topic = await events.topics.create({ name: "orders.created" });

await events.publish("orders.created", [{
  source: "orders-service",
  type: "order.created",
  data: { order_id: "ord_1234", amount: 99.99 },
}]);

const sub = await events.subscribe("orders.created", {
  endpoint: "https://hooks.example.com/orders",
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
