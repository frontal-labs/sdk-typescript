# @frontal-labs/agents

Define, deploy, and observe AI agents with LangChain, LangGraph, and Vercel
AI SDK integration.

## Installation

```bash
npm install @frontal-labs/agents
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { agents } from "@frontal-labs/agents";

const page = await agents.list({ limit: 10 });
```

The `agents` singleton reads `FRONTAL_API_KEY` and `FRONTAL_AGENTS_API_URL`
from the environment.

## Usage

### Explicit config

```ts
import { createAgentsClient } from "@frontal-labs/agents";

const agents = createAgentsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const agent = await agents.create({
  name: "order-ops",
  triggers: [{ event: "order.created" }],
  confidence: { autoExecuteAbove: 0.9, escalateBelow: 0.6 },
  memory: { type: "working" },
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createAgentsClient } from "@frontal-labs/agents";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const agents = createAgentsClient(client);
```

### Builder API

```ts
const agent = await agents
  .define("ticket-triager")
  .description("Classifies and routes support tickets")
  .trigger("support.ticket.created")
  .tags("support", "triage")
  .create();
```

### Run and watch

```ts
// Starting a run returns the run; watch it via SSE.
const run = await agents.use(agent.id).message("support.ticket.created", {
  ticketId: "t_987",
  text: "Payment failed after plan upgrade",
});

for await (const event of agents.use(agent.id).watch(run.id)) {
  console.log(event.type, event.data);
}
```

## Configuration

| Variable | Default |
|:---|:---|
| `FRONTAL_API_KEY` | — |
| `FRONTAL_AGENTS_API_URL` | `https://api.frontal.dev/v1` |
