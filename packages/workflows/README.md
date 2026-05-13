# @frontal/workflows

Workflow orchestration SDK with triggers, steps, approvals, and execution tracking.

## Installation

```bash
bun add @frontal/workflows @frontal/core
```

## Usage

```ts
import { FrontalClient } from "@frontal/core";
import { createWorkflowsClient } from "@frontal/workflows";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const workflows = createWorkflowsClient(client);

const list = await workflows.list({ limit: 10 });
const execution = await workflows.use("wfl_123").trigger({ source: "manual" });
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_WORKFLOWS_API_URL` (optional)
- `FRONTAL_API_URL` (fallback)
