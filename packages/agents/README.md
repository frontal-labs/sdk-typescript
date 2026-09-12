# @frontal-labs/agents

Define, deploy, and observe AI agents with LangChain, LangGraph, and Vercel
AI SDK integration.

## Installation

```bash
npm install @frontal-labs/agents
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const agents = f.agents;

const page = await agents.list({ limit: 10 });
```


## Usage

### Explicit config

```ts
import { createAgentsClient } from "@frontal-labs/agents";

const agents = createAgentsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const created = await agents.create({
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

### Typed agent (state, tools, approval)

`define(name, options)` is the one-shot form. `stateSchema` types the run
stream, `tools` share the `ToolSet` type with `ai.generateText`, and
`approveWhen` declares when a human must sign off. These three are
client-side contracts — they are not sent to the agents API.

```ts
import { tool, toApprovalStep } from "@frontal-labs/agents";
import { z } from "zod";

const triage = agents.define("ticket-triager", {
  description: "Classifies and routes tickets",
  triggers: "support.ticket.created",
  stateSchema: z.object({ tier: z.string(), score: z.number() }),
  tools: {
    classify: tool({ description: "Classify a ticket", inputSchema: z.object({ text: z.string() }) }),
    route: tool({ description: "Route to a queue", inputSchema: z.object({ queue: z.string() }) }),
  },
  approveWhen: (s) => s.tier === "enterprise",
  approvers: ["support-leads"],
});

const created = await triage.create();
const run = await created.message("support.ticket.created", { ticketId: "t_987" });

for await (const e of created.watch(run.id)) {
  if (e.type === "state" && created.requiresApproval(e.state)) {
    console.log("needs a human:", e.state.tier);
  }
}

// The approval contract maps 1:1 onto a workflow approval step:
const step = toApprovalStep("ticket-triager", created.hints);
await f.workflows
  .define("triage-review")
  .manual()
  .approval(step.id, step.config.approvers, { name: step.name })
  .create();
```

Re-attach to an existing agent with the same typing:
`agents.use("agt_123", { stateSchema })`.

### Run and watch

```ts
// Starting a run returns the run; watch it via SSE.
const agent = agents.use("agt_ticket_triager");
const run = await agent.message("support.ticket.created", {
  ticketId: "t_987",
  text: "Payment failed after plan upgrade",
});

for await (const event of agent.watch(run.id)) {
  if (event.type === "event") console.log(event.event, event.data);
  if (event.type === "error") console.error(event.error.code, event.error.retryable);
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
