# Frontal SDKs: Comprehensive Guide, Use Cases, and Examples

This guide covers all SDK packages in this repository:

- `@frontal-labs/core`
- `@frontal-labs/ai`
- `@frontal-labs/agents`
- `@frontal-labs/workflows`
- `@frontal-labs/pipelines`
- `@frontal-labs/graph`
- `@frontal-labs/ontology`
- `@frontal-labs/blob`
- `@frontal-labs/functions`
- `@frontal-labs/testing`

It includes architecture, setup, usage patterns, and end-to-end examples.

## 1) Global Setup

Install:

```bash
bun add @frontal-labs/core @frontal-labs/ai @frontal-labs/agents @frontal-labs/workflows @frontal-labs/pipelines @frontal-labs/graph @frontal-labs/ontology @frontal-labs/blob @frontal-labs/functions
```

Typical environment variables:

```bash
FRONTAL_API_KEY=frt_...
FRONTAL_API_URL=https://api.frontal.dev/v1
FRONTAL_AI_API_URL=https://ai.frontal.dev
```

Shared client setup pattern:

```ts
import { FrontalClient } from "@frontal-labs/core";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
  timeout: 30_000,
  maxRetries: 2
});
```

## 2) `@frontal-labs/core`

### What it does

Core transport/runtime used by all packages:

- request methods: `get`, `post`, `put`, `patch`, `delete`
- raw/form support: `getRaw`, `postRaw`, `putRaw`, `postFormData`
- SSE streaming: `stream`, `postStream`
- retries, timeout, typed errors
- pagination and polling helpers

### Use cases

- Build your own internal SDK on top of Frontal APIs
- Access non-modeled routes while keeping consistent auth/retry/error behavior
- Implement long-running operation polling and SSE consumers

### Example: custom endpoint + polling

```ts
import { FrontalClient, pollUntil } from "@frontal-labs/core";

const core = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1"
});

const run = await core.post<{ runId: string }>("/workflows/batch", {
  operation: "custom.start",
  payload: { tenant: "acme" }
});

const final = await pollUntil(
  () => core.get<{ status: string; output?: unknown }>("/workflows", { runId: run.runId }),
  {
    interval: 2000,
    timeout: 120_000,
    until: (x) => ["completed", "failed", "cancelled"].includes(x.status)
  }
);
```

## 3) `@frontal-labs/ai`

### What it does

Inference SDK for `ai.frontal.dev`:

- text generation (`generateText`)
- streaming text (`streamText`)
- embeddings (`embed`)
- structured outputs (`generateObject`)
- media helpers (speech/transcription/image/video/moderation)
- model listing

### Use cases

- customer support copilots
- extraction and classification pipelines
- semantic search + retrieval
- prompt templates and tool execution loops

### Example: generate + stream + embeddings

```ts
import { createAIClient } from "@frontal-labs/ai";

const ai = createAIClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_AI_API_URL ?? "https://ai.frontal.dev"
});

const summary = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Summarize this support ticket in 4 bullet points."
});

const stream = ai.streamText({
  model: "gpt-4o-mini",
  prompt: "Draft a response email from the summary.",
  onChunk: (chunk) => process.stdout.write(chunk)
});

for await (const _chunk of stream.textStream as any) {}

const emb = await ai.embed({
  model: "text-embedding-3-small",
  input: "How to reset account password"
});
```

### Example: structured object generation

```ts
const incident = await ai.generateObject({
  model: "gpt-4o-mini",
  prompt: "Extract severity, service, customerImpact from this report: ...",
  schema: {
    type: "object",
    properties: {
      severity: { type: "string" },
      service: { type: "string" },
      customerImpact: { type: "string" }
    },
    required: ["severity", "service", "customerImpact"]
  }
});
```

## 4) `@frontal-labs/agents`

### What it does

Agent lifecycle and execution SDK:

- builder-based definition (`define(...)`)
- create/list/get/update/delete
- deploy/pause/resume/rollback/simulate
- executions, escalations, experiments
- timeline/event watching

### Use cases

- policy-aware autonomous assistants
- delegated decision workflows
- controlled rollout/experimentation for agent strategies

### Example: define and deploy an agent

```ts
import { createAgentsClient } from "@frontal-labs/agents";

const agents = createAgentsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

const agent = await agents
  .define("ticket-triager")
  .description("Classifies and routes tickets")
  .manual()
  .trigger("support.ticket.created")
  .tags("support", "triage")
  .create();

await agents.use(agent.id).deploy("production", { runSimulationFirst: true });
```

### Example: run + watch

```ts
const exec = await agents.use("agt_123").message("support.ticket.created", {
  ticketId: "t_987",
  text: "Payment failed after plan upgrade"
});

for await (const event of agents.use("agt_123").watch(exec.executionId)) {
  console.log(event.type, event.data);
}
```

## 5) `@frontal-labs/workflows`

### What it does

Workflow orchestration SDK:

- workflow builder DSL (manual/schedule/event/webhook triggers)
- workflow steps (task, approval, condition, parallel, delay, notification)
- create/update/delete/activate/pause
- trigger and query executions
- approvals/templates/steps APIs

### Use cases

- approvals and governance flows
- incident management playbooks
- multi-step customer onboarding

### Example: approval workflow

```ts
import { createWorkflowsClient } from "@frontal-labs/workflows";

const workflows = createWorkflowsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

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

## 6) `@frontal-labs/pipelines`

### What it does

Data pipeline orchestration SDK:

- pipeline builder (`collect`, `transform`, `enrich`, `validate`, `write`, `notify`)
- source definitions (`fromManual`, `fromSchedule`, `fromWebhook`, `fromGraph`)
- create/update/delete/list/get
- run management, backfills, health, lineage

### Use cases

- CRM-to-graph synchronization
- daily data quality and normalization jobs
- historical reprocessing and backfills

### Example: scheduled ingest pipeline

```ts
import { createPipelinesClient } from "@frontal-labs/pipelines";

const pipelines = createPipelinesClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

const pipeline = await pipelines
  .define("crm-sync")
  .fromSchedule("0 * * * *")
  .collect("fetch-crm", { source: "salesforce" })
  .transform("normalize", { mapping: { company_name: "companyName" } })
  .write("upsert-graph", { target: "graph" })
  .create();

const run = await pipelines.use(pipeline.id).trigger({ dryRun: false });
const final = await pipelines.use(pipeline.id).waitForRun(run.id);
```

## 7) `@frontal-labs/graph`

### What it does

Graph operations SDK:

- query/analyze/neighborhood/path/build
- entity accessor (`use(entityType).get/create/update/delete/list`)
- relationships add/remove
- history/provenance and revert-like run patterns

### Use cases

- entity lookups and graph traversal
- knowledge graph enrichment
- provenance-aware debugging of state changes

### Example: query + relationships

```ts
import { createGraphClient } from "@frontal-labs/graph";

const graph = createGraphClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

const entities = await graph.query({
  entityType: "customer",
  conditions: { tier: "enterprise" },
  limit: 25
});

await graph.use("customer").addRelationship(
  "cust_123",
  "ticket_456",
  "opened_ticket",
  { weight: 1 }
);
```

## 8) `@frontal-labs/ontology`

### What it does

Ontology/modeling SDK:

- model lifecycle accessor
- ontology validation/generation/inference operations
- migrations namespace
- rules and mixins namespaces
- suggestions acceptance/rejection flows

### Use cases

- domain schema evolution
- automated ontology proposal generation
- controlled migration planning and rollout

### Example: validate + generate

```ts
import { createOntologyClient } from "@frontal-labs/ontology";

const ontology = createOntologyClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

await ontology.validate({
  name: "Incident",
  fields: [{ name: "severity", type: "string" }]
} as any);

const proposal = await ontology.generation.generate(
  "Model a billing dispute lifecycle with ownership and SLA states.",
  { substrates: ["billing", "support"] }
);
```

## 9) `@frontal-labs/blob`

### What it does

Blob/object storage SDK:

- upload/download/downloadStream
- list/getMetadata/delete
- signed URLs
- copy/move object operations

### Use cases

- artifact storage for workflows and pipelines
- document ingestion for AI
- signed temporary access for client uploads/downloads

### Example: upload + sign + metadata

```ts
import { createBlobClient } from "@frontal-labs/blob";

const blob = createBlobClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

await blob.upload(
  "contracts",
  "2026/q2/master.pdf",
  Buffer.from("...binary..."),
  "application/pdf"
);

const url = await blob.getSignedUrl("contracts", {
  key: "2026/q2/master.pdf",
  operation: "read",
  expiresIn: 900
});

const meta = await blob.getMetadata("contracts", "2026/q2/master.pdf");
```

## 10) `@frontal-labs/functions`

### What it does

Function runtime SDK:

- deploy/list/get/delete
- invoke/invokeStream
- invocation stats
- trigger updates

### Use cases

- internal automation hooks
- lightweight per-event computation
- reusable callable business actions

### Example: deploy + invoke

```ts
import { createFunctionsClient } from "@frontal-labs/functions";

const functions = createFunctionsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

const fn = await functions.deploy({
  name: "score-lead",
  runtime: "nodejs20",
  entrypoint: "index.handler",
  code: "export const handler = async (input) => ({ score: 42 })",
  memoryMb: 256,
  timeoutSec: 10
} as any);

const result = await functions.invoke(fn.id, { payload: { leadId: "l_123" } });
```

## 11) `@frontal-labs/testing`

### What it does

Testing toolkit for SDK consumers and package maintainers:

- mock HTTP routes and fetch
- capture/assert requests
- create test clients quickly
- mock pagination payload helper

### Use cases

- unit tests for services using Frontal SDKs
- integration-style tests without network calls
- regression tests for payload shape and route mapping

### Example

```ts
import { createTestHttpClient, mockPageResponse } from "@frontal-labs/testing";
import { WorkflowsService } from "@frontal-labs/workflows/src/service";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/v1/workflows", body: mockPageResponse([]) }
]);

const service = new WorkflowsService(http);
await service.list({ limit: 1 });

mock.expectCalled("GET", "/v1/workflows");
```

## 12) End-to-End Production Pattern

A common high-value orchestration flow:

1. Ingest files with `@frontal-labs/blob`
2. Extract with `@frontal-labs/ai`
3. Normalize through `@frontal-labs/pipelines`
4. Persist graph relationships via `@frontal-labs/graph`
5. Enforce taxonomy changes via `@frontal-labs/ontology`
6. Coordinate approvals with `@frontal-labs/workflows`
7. Delegate targeted actions with `@frontal-labs/agents`
8. Execute specialized logic in `@frontal-labs/functions`

## 13) Error Handling Pattern

```ts
import { FrontalError } from "@frontal-labs/core";

try {
  // any SDK call
} catch (e) {
  if (e instanceof FrontalError) {
    console.error("code:", e.code, "status:", e.statusCode, "request:", e.requestId);
  } else {
    console.error("transport/runtime error", e);
  }
}
```

## 14) Operational Notes

- Prefer explicit `baseUrl` in production services.
- Keep API keys scoped and rotated.
- Use streaming APIs for user-facing latency-sensitive generation.
- Use idempotency/request IDs where available for retried mutations.
- Keep tests pinned to SDK route/payload contracts (`@frontal-labs/testing`).

