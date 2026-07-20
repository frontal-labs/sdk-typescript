# @frontal-labs/workflows

Workflow orchestration SDK — triggers, steps, approvals, templates, and
execution tracking.

## Installation

```bash
npm install @frontal-labs/workflows
```

`@frontal-labs/_core` is included automatically as a dependency.

## Quick Start

```ts
import { workflows } from "@frontal-labs/workflows";

const list = await workflows.list({ limit: 10 });
```

The `workflows` singleton reads `FRONTAL_API_KEY` and
`FRONTAL_WORKFLOWS_API_URL` from the environment.

## Usage

### Explicit config

```ts
import { createWorkflowsClient } from "@frontal-labs/workflows";

const workflows = createWorkflowsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const execution = await workflows.use("wfl_123").trigger({
  source: "manual",
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/_core";
import { createWorkflowsClient } from "@frontal-labs/workflows";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const workflows = createWorkflowsClient(client);
```

### Builder API

```ts
const wf = await workflows
  .define("invoice-approval")
  .manual()
  .task("validate", { ruleset: "invoice-v1" })
  .approval("manager-approval", ["finance@acme.com"])
  .task("post-ledger", { system: "erp" })
  .notification("notify-requester", "Invoice approved", ["email"])
  .create();

const run = await workflows.use(wf.id).trigger({ invoiceId: "inv_001" });
const done = await workflows.use(wf.id).waitForCompletion(run.id);
```

### Approvals

```ts
const pending = await workflows.approvals.list({ status: "pending" });
await workflows.approvals.approve("apr_123", { comment: "LGTM" });
```

### Templates

```ts
const template = await workflows.templates.get("onboarding-v2");
const wf = await workflows.createFromTemplate(template.id, {
  name: "Customer Onboarding - Acme",
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
