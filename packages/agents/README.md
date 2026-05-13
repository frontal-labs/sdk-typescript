# @frontal/agents

Define, deploy, and operate Frontal agents.

## Installation

```bash
bun add @frontal/agents @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createAgentsClient } from "@frontal/agents";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const agents = createAgentsClient(client);

const page = await agents.list({ limit: 10 });
const created = await agents.create({
  name: "order-ops",
  triggers: [{ event: "order.created" }],
  scope: {
    read: ["order"],
    write: ["incident"],
    actions: [],
    escalate: [],
    invokeAgents: [],
    invokeFunctions: [],
  },
  confidence: {
    autoExecuteAbove: 0.9,
    escalateBelow: 0.6,
    requireReviewBetween: true,
  },
  memory: { type: "working" },
  retry: { maxRetries: 3, retryDelay: 1000, backoff: "exponential", retryOn: [429, 500] },
});
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_AGENTS_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)

Default base URL: `https://api.frontal.dev/v1`.
