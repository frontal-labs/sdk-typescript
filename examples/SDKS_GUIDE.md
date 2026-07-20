# Frontal SDKs: Comprehensive Guide, Use Cases, and Examples

This guide covers all SDK packages in this repository:

- `frontal/core`
- `@frontal-labs/ai`
- `@frontal-labs/agents`
- `@frontal-labs/workflows`
- `@frontal-labs/pipelines`
- `@frontal-labs/graph`
- `@frontal-labs/ontology`
- `@frontal-labs/blob`
- `@frontal-labs/workers`
- `frontal/testing`
- `@frontal-labs/auth`
- `@frontal-labs/observability`
- `@frontal-labs/events`
- `@frontal-labs/audit`
- `@frontal-labs/governance`
- `@frontal-labs/billing`
- `@frontal-labs/webhooks`
- `@frontal-labs/schedules`
- `@frontal-labs/sandbox`
- `@frontal-labs/datasets`
- `@frontal-labs/lineage`

It includes architecture, setup, usage patterns, and end-to-end examples.

## 1) Global Setup

Install:

```bash
bun add frontal/core @frontal-labs/ai @frontal-labs/agents @frontal-labs/workflows @frontal-labs/pipelines @frontal-labs/graph @frontal-labs/ontology @frontal-labs/blob @frontal-labs/workers
```

Typical environment variables:

```bash
FRONTAL_API_KEY=frt_...
FRONTAL_API_URL=https://api.frontal.dev/v1
FRONTAL_AI_API_URL=https://ai.frontal.dev
```

Shared client setup pattern:

```ts
import { FrontalClient } from "frontal/core";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
  timeout: 30_000,
  maxRetries: 2
});
```

## 2) `frontal/core`

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
import { FrontalClient, pollUntil } from "frontal/core";

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

### Example: define an agent

```ts
import { createAgentsClient } from "@frontal-labs/agents";

const agents = createAgentsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

const agent = await agents
  .define("ticket-triager")
  .description("Classifies and routes tickets")
  .trigger("support.ticket.created")
  .tags("support", "triage")
  .create();
```

### Example: run + watch

```ts
// Starting a run returns the run object; watch it via SSE.
const run = await agents.use(agent.id).message("support.ticket.created", {
  ticketId: "t_987",
  text: "Payment failed after plan upgrade"
});

for await (const event of agents.use(agent.id).watch(run.id)) {
  console.log(event.type, event.data);
}

// Or poll to completion, then read the transcript.
const done = await agents.use(agent.id).waitForCompletion(run.id);
const transcript = await agents.use(agent.id).conversation(run.id);
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

await ontology.validation.validatePayload({
  objectType: "Incident",
  payload: { severity: "high" }
});

const proposal = await ontology.engine.generate({
  description: "Model a billing dispute lifecycle with ownership and SLA states.",
  substrates: ["billing", "support"]
});

// Browse the resulting object and relationship types.
const objectTypes = await ontology.objects.listObjectTypes();
const relTypes = await ontology.relationships.listTypes();
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

## 10) `@frontal-labs/workers`

### What it does

Serverless Workers SDK for the Frontal edge runtime (`/v1/workers`):

- `deploy` a worker from source
- `invoke` a deployed worker by path (returns the raw `Response`)

> Renamed from `@frontal-labs/functions` — the backend edge runtime calls these
> **workers**.

### Use cases

- internal automation hooks
- lightweight per-request computation at the edge
- reusable callable business actions

### Example: deploy + invoke

```ts
import { createWorkersClient } from "@frontal-labs/workers";

const workers = createWorkersClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1"
});

await workers.deploy({
  name: "score-lead",
  entrypoint: "default",
  code: "export default () => Response.json({ score: 42 })",
  envVars: { MODEL: "v2" }
});

const res = await workers.invoke("score-lead", {
  method: "POST",
  path: "/",
  body: JSON.stringify({ leadId: "l_123" })
});
const result = await res.json();
```

## 11) `frontal/testing`

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
import { createTestHttpClient, mockPageResponse } from "frontal/testing";
import { WorkflowsService } from "@frontal-labs/workflows/src/service";

const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/v1/workflows", body: mockPageResponse([]) }
]);

const service = new WorkflowsService(http);
await service.list({ limit: 1 });

mock.expectCalled("GET", "/v1/workflows");
```

## 12) `@frontal-labs/auth`

### What it does

GoTrue-compatible authentication SDK under `api.frontal.dev/v1`:

- client-side: signUp, signInWithPassword, signInWithOAuth, signInWithOtp, signInWithSSO, signInAnonymously
- session management: getSession, getUser, updateUser, refreshSession, signOut
- MFA: enroll (TOTP/phone/webauthn), challenge, verify, unenroll, listFactors
- OAuth 2.1 server API, Web3 auth, PKCE code exchange
- admin operations (service_role key): createUser, listUsers, getUserById, updateUserById, deleteUser, inviteUserByEmail, generateLink

### Use cases

- user authentication for web/mobile apps
- enterprise SSO integration
- multi-factor enrollment and verification
- server-side user administration and invitation

### Example: sign-up, sign-in, and session refresh

```ts
import { createAuthClient } from "@frontal-labs/auth";

const auth = createAuthClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const signUp = await auth.signUp({
  email: "dev@example.com",
  password: "super-secret-123"
});

const signIn = await auth.signInWithPassword({
  email: "dev@example.com",
  password: "super-secret-123"
});

const session = signIn.data.session;
const refreshed = await auth.refreshSession({
  refresh_token: session!.refresh_token
});

await auth.signOut();
```

### Example: admin user management

```ts
const admin = createAuthClient({
  apiKey: process.env.FRONTAL_SERVICE_ROLE_KEY!
});

const user = await admin.admin.createUser({
  email: "new-dev@example.com",
  password: "temp-password-123",
  email_confirm: true,
  user_metadata: { department: "engineering" }
});

const users = await admin.admin.listUsers({ page: 1, perPage: 20 });
await admin.admin.inviteUserByEmail("colleague@example.com");
```

### Example: MFA enrollment and verification

```ts
const enroll = await auth.mfa.enroll({
  factorType: "totp",
  friendlyName: "Auth app",
  issuer: "Frontal"
});

const challenge = await auth.mfa.challenge({ factorId: enroll.data.id });
const verify = await auth.mfa.verify({
  factorId: enroll.data.id,
  challengeId: challenge.data!.id,
  code: "123456"
});
```

## 13) `@frontal-labs/observability`

### What it does

Monitoring and telemetry SDK:

- logs: query (paginated), stream (SSE), ingest
- metrics: query time series, list available metrics, ingest data points
- traces: get by ID, list and query with filters
- alerts: CRUD, enable/disable, incident listing
- dashboards: CRUD with widgets, share with expiry

### Use cases

- centralized log aggregation and search
- real-time metric dashboards
- distributed tracing for microservices
- alerting and incident management

### Example: logs and metrics

```ts
import { createObservabilityClient } from "@frontal-labs/observability";

const obs = createObservabilityClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const logs = await obs.logs.query({
  query: "level:error",
  time_from: new Date(Date.now() - 3600000).toISOString(),
  time_to: new Date().toISOString(),
  limit: 50
});

for await (const entry of logs) {
  console.log(`[${entry.level}] ${entry.service}: ${entry.message}`);
}

const metrics = await obs.metrics.query("cpu_usage", {
  from: new Date(Date.now() - 3600000).toISOString(),
  to: new Date().toISOString(),
  granularity: "1m"
});
```

### Example: alerts and dashboards

```ts
const alert = await obs.alerts.create({
  name: "High Error Rate",
  metric: "http_errors",
  condition: ">=",
  threshold: 0.05,
  severity: "critical",
  duration: "5m",
  channels: ["email", "slack"],
  enabled: true
});

const dash = await obs.dashboards.create({
  name: "API Overview",
  widgets: [
    { id: "w1", type: "line", title: "Request Rate", metric: "http_requests", width: 12, height: 3 },
    { id: "w2", type: "stat", title: "P99 Latency", metric: "http_latency_p99", width: 6, height: 2 }
  ]
});

const shared = await obs.dashboards.share(dash.id, { expires_in: "24h" });
```

## 14) `@frontal-labs/events`

### What it does

Event bus and pub/sub SDK:

- publish events to topics with CloudEvents-compatible envelope
- subscribe/unsubscribe with endpoint and filter configuration
- topic CRUD and listing
- subscription lifecycle (pause/resume)
- dead-letter queue inspection, replay, and purge
- event schema registry (validate event payloads)

### Use cases

- service-to-service asynchronous communication
- webhook delivery fan-out
- event sourcing and CQRS patterns
- dead-letter recovery and replay

### Example: publish and subscribe

```ts
import { createEventsClient } from "@frontal-labs/events";

const events = createEventsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const topic = await events.topics.create({
  name: "orders.created",
  description: "Fired when a new order is placed"
});

await events.publish("orders.created", [{
  source: "orders-service",
  type: "order.created",
  data: { order_id: "ord_1234", amount: 99.99, currency: "USD" },
  metadata: { user_id: "usr_abc" }
}]);

const sub = await events.subscribe("orders.created", {
  endpoint: "https://hooks.myapp.com/orders",
  filter: "event.data.amount > 50"
});

await events.subscriptions.pause(sub.id);
await events.subscriptions.resume(sub.id);
```

### Example: replays and consumers

```ts
// Replay previously-published (e.g. failed) events.
await events.replays.create({ topic: "orders.created" });
const replays = await events.replays.list({ limit: 25 });

// Inspect consumers and routing.
const consumers = await events.consumers.list();
const routes = await events.routes.list();
```

## 15) `@frontal-labs/audit`

### What it does

Audit trail and compliance SDK:

- log audit events with actor, action, resource, and status
- query events with time range, action, and status filters
- export audit logs as CSV or JSON
- audit trail management (create named filters)
- compliance check execution and result retrieval

### Use cases

- SOC 2 / ISO 27001 compliance logging
- change tracking across the platform
- security incident investigation
- automated compliance reporting

### Example: logging and querying

```ts
import { createAuditClient } from "@frontal-labs/audit";

const audit = createAuditClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

await audit.log({
  action: "pipeline.triggered",
  resource: { type: "pipeline", id: "ppl_abc" },
  metadata: { triggered_by: "schedule", schedule_id: "sch_1" },
  status: "success"
});

const results = await audit.query({
  action: "pipeline.triggered",
  time_from: new Date(Date.now() - 86400000).toISOString(),
  time_to: new Date().toISOString()
});

const csv = await audit.export({ format: "csv" });
```

## 16) `@frontal-labs/governance`

### What it does

Policy and RBAC governance SDK:

- policy CRUD with rules (resource, actions, effect, conditions)
- policy evaluation with context
- RBAC binding management (user → role → resource)
- access check queries

### Use cases

- attribute-based access control (ABAC)
- compliance policy enforcement
- least-privilege access management
- policy-as-code workflows

### Example: policies and RBAC

```ts
import { createGovernanceClient } from "@frontal-labs/governance";

const gov = createGovernanceClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const policy = await gov.policies.create({
  name: "No public dataset access",
  category: "data_protection",
  definition: { effect: "deny", resource: "datasets.*", actions: ["read", "export"] },
  definitionFormat: "rego"
});

// Validate a definition without saving, and browse templates.
const validation = await gov.policies.validate({
  definition: policy.definition,
  definitionFormat: "rego"
});
const templates = await gov.policies.templates();

// Compliance: run an assessment and read the score.
const assessment = await gov.compliance.runAssessment({ framework: "soc2" });
const score = await gov.compliance.score({ framework: "soc2" });

// RBAC: roles, permissions, and access checks.
const access = await gov.access.check({
  userId: "usr_abc",
  roleNames: ["pipeline-operator"],
  action: "update",
  resourceType: "pipeline"
});
```

## 17) `@frontal-labs/billing`

### What it does

Billing and subscription management SDK:

- plan listing and retrieval
- subscription lifecycle (create, update, change plan, cancel)
- invoice history with payment
- usage metering and reporting
- payment method management

### Use cases

- SaaS subscription management
- usage-based billing
- invoice retrieval for accounting
- plan upgrade/downgrade flows

### Example: subscription and usage

```ts
import { createBillingClient } from "@frontal-labs/billing";

const billing = createBillingClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const customer = await billing.customers.create({ name: "Acme", externalId: "acme" });
const plans = await billing.plans.list();

const sub = await billing.subscriptions.create({
  customerId: customer.id,
  planId: plans.data[0].id
});
await billing.subscriptions.update(sub.id, { planId: "plan_pro" });

const invoices = await billing.invoices.list();
for await (const inv of invoices) {
  console.log(`${inv.id}: [${inv.status}]`);
}

// Meters, prices, wallets, addons are first-class resources too.
const meter = await billing.meters.create({ name: "api_calls", aggregation: "sum" });
const balance = await billing.wallets.realTimeBalance("wal_123");
```

## 18) `@frontal-labs/webhooks`

### What it does

Webhook endpoint management SDK:

- endpoint CRUD with event type filtering
- secret rotation for security
- delivery attempt tracking with retry
- delivery statistics (success rate, latency, error rate)

### Use cases

- third-party integration notification delivery
- custom webhook receiver setup
- delivery monitoring and debugging
- automatic retry for failed deliveries

### Example: endpoint management

```ts
import { createWebhooksClient } from "@frontal-labs/webhooks";

const webhooks = createWebhooksClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const endpoint = await webhooks.endpoints.create({
  url: "https://hooks.myapp.com/frontal-events",
  events: ["order.created", "payment.completed"]
});

const rotated = await webhooks.endpoints.rotateSecret(endpoint.id);

const deliveries = await webhooks.deliveries.list({
  webhook_id: endpoint.id,
  status: "failed"
});

for await (const del of deliveries) {
  await webhooks.deliveries.retry(del.id);
}

const stats = await webhooks.stats.getStats({
  webhook_id: endpoint.id
});
console.log(`Success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
```

## 19) `@frontal-labs/schedules`

### What it does

Cron scheduling SDK:

- schedule CRUD with cron expressions and timezone
- run history and manual triggering
- cron expression validation and next-run preview
- pause/resume schedule
- target any pipeline, workflow, function, or webhook

### Use cases

- nightly data exports and reports
- periodic health checks
- recurring pipeline execution
- time-based workflow triggers

### Example: create and trigger cron

```ts
import { createSchedulesClient } from "@frontal-labs/schedules";

const schedules = createSchedulesClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const valid = await schedules.cron.validate("0 9 * * 1-5");
const next = await schedules.cron.nextRuns("0 */6 * * *", 5);

const schedule = await schedules.schedules.create({
  name: "Nightly Data Export",
  cron: "0 2 * * *",
  timezone: "America/New_York",
  target: { type: "pipeline", id: "ppl_export" },
  payload: { format: "parquet", destination: "s3://data-lake/exports/" }
});

const run = await schedules.schedules.trigger(schedule.id);

const runs = await schedules.runs.list(schedule.id);
for await (const r of runs) {
  console.log(`${r.id}: ${r.status}`);
}
```

## 20) `@frontal-labs/sandbox`

### What it does

Compile-and-judge code execution SDK:

- `languages()` — list supported languages
- `selfTest()` — compile and run once against a single stdin input
- `submit()` — compile and judge against a set of test cases (scored)
- sandbox tiers and per-request resource limits

### Use cases

- secure execution of user-submitted code
- automated grading / judging against test cases
- AI agent tool execution with isolation

### Example: self-test and judge

```ts
import { createSandboxClient } from "@frontal-labs/sandbox";

const sandbox = createSandboxClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const languages = await sandbox.languages();

const test = await sandbox.selfTest({
  language: "Python",
  code: "print('hello')",
  stdin: ""
});
console.log(test.summary?.stdout);

const result = await sandbox.submit({
  language: "Python",
  code: "print(input())",
  task: {
    cases: [{ caseId: 1, score: 100, input: "ok\n", answer: "ok\n" }]
  }
});
console.log(result.summary.result, result.summary.score);
```

## 21) `@frontal-labs/datasets`

### What it does

Dataset management SDK:

- dataset CRUD with schema definition
- row-level data insert, query, upsert, and delete
- version management (create, compare, rollback)
- dataset statistics (row count, storage size)
- data preview and sampling

### Use cases

- structured data storage for analytics
- training data preparation for ML
- data versioning and rollback
- ETL source/sink for pipelines

### Example: ingest, read, and browse the catalog

```ts
import { createDatasetsClient } from "@frontal-labs/datasets";

const datasets = createDatasetsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

// Submit an ingestion request (ingest service).
const run = await datasets.ingest({
  dataset: "user_events",
  source: "events-topic"
});

// List and read datasets.
const page = await datasets.list({ limit: 20 });
const ds = await datasets.get("user_events");

// Resolve schemas.
const schemas = await datasets.schemas.list();

// Browse the catalog.
const catalogDatasets = await datasets.catalog.datasets.list();
const sources = await datasets.catalog.sources.list();
```

## 22) `@frontal-labs/lineage`

### What it does

Data lineage tracking SDK:

- lineage graph retrieval with configurable depth
- node and edge listing with filtering
- full trace of resource dependencies
- impact analysis for schema/data changes

### Use cases

- data provenance and audit
- impact analysis before schema migrations
- dependency visualization for data pipelines
- compliance reporting for data flows

### Example: graph and impact analysis

```ts
import { createLineageClient } from "@frontal-labs/lineage";

const lineage = createLineageClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const graph = await lineage.graph.get("ds_sales", { depth: 3 });
for (const edge of graph.edges) {
  console.log(`${edge.source_id} → [${edge.type}] → ${edge.target_id}`);
}

const nodes = await lineage.nodes.list({ type: "dataset" });
const trace = await lineage.nodes.trace("ds_sales");

const impact = await lineage.impact.analyzeChange("ds_sales", {
  type: "update",
  field: "amount"
});
for (const r of impact.affected_resources) {
  console.log(`${r.name} (${r.type}): ${r.impact} impact`);
}
```

## 23) End-to-End Production Pattern

A common high-value orchestration flow:

1. Authenticate users with `@frontal-labs/auth` (GoTrue)
3. Ingest files with `@frontal-labs/blob`
4. Extract and classify with `@frontal-labs/ai`
6. Normalize through `@frontal-labs/pipelines`
7. Store structured data in `@frontal-labs/datasets`
8. Persist relationships via `@frontal-labs/graph`
9. Enforce taxonomy via `@frontal-labs/ontology`
10. Track provenance with `@frontal-labs/lineage`
11. Communicate across services with `@frontal-labs/events`
16. Schedule recurring work with `@frontal-labs/schedules`
17. Execute isolated code in `@frontal-labs/sandbox`
18. Coordinate approvals with `@frontal-labs/workflows`
19. Delegate decisions with `@frontal-labs/agents`
20. Execute specialized logic in `@frontal-labs/workers`
21. Monitor everything with `@frontal-labs/observability`
22. Log compliance with `@frontal-labs/audit`
23. Enforce policies with `@frontal-labs/governance`
24. Track costs with `@frontal-labs/billing`

## 24) Error Handling Pattern

```ts
import { FrontalError } from "frontal/core";

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

## 25) Operational Notes

- Prefer explicit `baseUrl` in production services.
- Keep API keys scoped and rotated.
- Use streaming APIs for user-facing latency-sensitive generation.
- Use idempotency/request IDs where available for retried mutations.
- Keep tests pinned to SDK route/payload contracts (`frontal/testing`).

