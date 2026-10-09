# Frontal SDKs: Comprehensive Guide, Use Cases, and Examples

This guide covers all SDK packages in this repository:

- `@frontal-labs/core`
- `@frontal-labs/ai`
- `@frontal-labs/agents`
- `@frontal-labs/workflows`
- `@frontal-labs/pipelines`
- `@frontal-labs/ontology`
- `@frontal-labs/blob`
- `@frontal-labs/testing`
- `@frontal-labs/auth`
- `@frontal-labs/observability`
- `@frontal-labs/audit`
- `@frontal-labs/governance`
- `@frontal-labs/billing`
- `@frontal-labs/webhooks`
- `@frontal-labs/schedules`
- `@frontal-labs/lineage`
- `@frontal-labs/connectors`
- `@frontal-labs/data`

It includes architecture, setup, usage patterns, and end-to-end examples.

## 1) Global Setup

Install:

```bash
bun add @frontal-labs/sdk
```

Typical environment variables:

```bash
FRONTAL_API_KEY=frt_...
FRONTAL_API_URL=https://api.frontal.dev/v1
FRONTAL_ENV=development
```

One client, every service. All examples in this guide assume this setup:

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
  timeout: 30_000,
  maxRetries: 2,
});

// Service handles used throughout the guide.
const {
  ai, agents, workflows, pipelines, ontology, blob, auth,
  observability, audit, governance, billing, webhooks, schedules,
  lineage, connectors, data,
} = f;
const obs = observability;
const client = f.client; // underlying FrontalClient for raw calls
```

Prefer a single package? Every service is also published standalone
(`@frontal-labs/ai`, `@frontal-labs/agents`, ...) with a `createXClient()`
factory that accepts either `{ apiKey }` or a shared `FrontalClient`.

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
  () => core.get<{ status: string; output?: unknown }>(`/workflows/runs/${run.runId}`),
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
const agent = await agents
  .define("ticket-triager")
  .description("Classifies and routes tickets")
  .trigger("support.ticket.created")
  .tags("support", "triage")
  .create();

console.log(agent.id, agent.status); // resource fields + accessor methods
```

### Example: typed agent (state, tools, approval)

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

// The approval contract maps 1:1 onto a workflow approval step.
const step = toApprovalStep("ticket-triager", created.hints);
await workflows
  .define("triage-review")
  .manual()
  .approval(step.id, step.config.approvers, { name: step.name })
  .create();
```

Re-attach to an existing agent with the same typing:
`agents.use("agt_123", { stateSchema })`.

### Example: run + watch

```ts
// Starting a run returns the run object; watch it via SSE.
const agent = agents.use("agt_ticket_triager");
const run = await agent.message("support.ticket.created", {
  ticketId: "t_987",
  text: "Payment failed after plan upgrade"
});

for await (const event of agent.watch(run.id)) {
  if (event.type === "event") console.log(event.event, event.data);
  if (event.type === "error") console.error(event.error.code, event.error.retryable);
}

// Or poll to completion, then read the transcript.
const done = await agent.waitForCompletion(run.id);
const transcript = await agent.conversation(run.id);
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

await blob.upload({
  bucket: "contracts",
  key: "2026/q2/master.pdf",
  data: Buffer.from("...binary..."),
  contentType: "application/pdf",
});

const url = await blob.getSignedUrl({
  bucket: "contracts",
  options: { key: "2026/q2/master.pdf", operation: "read", expiresIn: 900 },
});

const meta = await blob.getMetadata({ bucket: "contracts", key: "2026/q2/master.pdf" });
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
import { createTestClient, mockPageResponse } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  { method: "GET", path: "/workflows", body: mockPageResponse([]) }
]);

const f = new Frontal(client);
await f.workflows.list({ limit: 1 });

mock.expectCalled("GET", "/workflows");
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
if (session) {
  const refreshed = await auth.refreshSession({
    refreshToken: session.refreshToken
  });
  console.log(refreshed.data.user?.id);
}

await auth.signOut();
```

### Example: admin user management

```ts
import { createAuthClient } from "@frontal-labs/auth";

const admin = createAuthClient({
  apiKey: process.env.FRONTAL_SERVICE_ROLE_KEY!
});

const user = await admin.admin.createUser({
  email: "new-dev@example.com",
  password: "temp-password-123",
  emailConfirm: true,
  userMetadata: { department: "engineering" }
});

const users = await admin.admin.listUsers({ page: 1, perPage: 20 });
await admin.admin.inviteUserByEmail("colleague@example.com");
```

### Example: MFA enrollment and verification

```ts
// MFA responses are untyped today; narrow them yourself.
const enroll = (await auth.mfa.enroll({
  factorType: "totp",
  friendlyName: "Auth app",
  issuer: "Frontal"
})) as { data: { id: string } };

const challenge = (await auth.mfa.challenge({ factorId: enroll.data.id })) as {
  data: { id: string };
};
const verify = await auth.mfa.verify({
  factorId: enroll.data.id,
  challengeId: challenge.data.id,
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
  timeFrom: new Date(Date.now() - 3600000).toISOString(),
  timeTo: new Date().toISOString(),
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

const shared = await obs.dashboards.share(dash.id, { expiresIn: "24h" });
```

## 15) `@frontal-labs/audit`

### What it does

Append-only audit event log (`/v1/audit/events`):

- record events with actor, action, event domain/type, resource, outcome, run id and metadata
- record batches atomically; `idempotencyKey` makes retries safe
- query by actor, action, run, domain/type, resource type, outcome and time range (paginated)
- fetch a single event by id

Compliance frameworks, assessments and violations live in `@frontal-labs/governance`.

### Use cases

- SOC 2 / ISO 27001 evidence logging
- change tracking across the platform
- security incident investigation
- correlating agent/workflow runs (`runId`) with the actions they took

### Example: logging and querying

```ts
import { createAuditClient } from "@frontal-labs/audit";

const audit = createAuditClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

await audit.log({
  action: "pipeline.triggered",
  eventDomain: "pipelines",
  resourceType: "pipeline",
  resourceId: "ppl_abc",
  outcome: "success",
  metadata: { triggeredBy: "schedule", scheduleId: "sch_1" },
});

const results = await audit.events.list({
  action: "pipeline.triggered",
  resourceType: "pipeline",
});
for (const event of results.data) console.log(event.id, event.action);
```

## 16) `@frontal-labs/governance`

### What it does

Policies, compliance and RBAC (`/v1/policies`, `/v1/compliance`, `/v1/roles`, `/v1/permissions`, `/v1/access`):

- policy CRUD with rules (resource, actions, effect, conditions), versions, templates, validation
- compliance frameworks, assessments, violations and score
- roles and permissions
- access checks (`access.check({ userId, roleNames, action })`)

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
  webhookId: endpoint.id,
  status: "failed"
});

for await (const del of deliveries) {
  await webhooks.deliveries.retry(del.id);
}

const stats = await webhooks.stats.get({ webhookId: endpoint.id });
console.log(stats);
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
const parsed = await schedules.cron.parse("0 */6 * * *");

const schedule = await schedules.create({
  name: "Nightly Data Export",
  cron: "0 2 * * *",
  timezone: "America/New_York",
  target: { type: "pipeline", id: "ppl_export" },
  payload: { format: "parquet", destination: "s3://data-lake/exports/" }
});

const run = await schedules.trigger(schedule.id);
console.log(run.id, run.status);
```

## 21) `@frontal-labs/lineage`

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


## 21) `@frontal-labs/lineage`

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

## 22b) `@frontal-labs/data`

## 21) `@frontal-labs/lineage`

### What it does

Data platform sub-domains — aggregations, archival, enrichment, exports,
normalization, quality, serving, streams, sync, transformations, federated
query and schema registry. Every sub-domain also exposes `capabilities()`,
`health()`, `runs()` and `createRun()`.

### Example: aggregation + federated query

```ts
const agg = await data.aggregations.create({
  name: "daily-revenue",
  source: "acme.billing.invoices",
  groupBy: ["day"],
});
await data.aggregations.execute(agg.id as string);

const rows = await data.query.federated({
  sql: "SELECT day, sum(amount) FROM acme.billing.invoices GROUP BY day",
});
console.log(rows);
```

## 23) End-to-End Production Pattern

A common high-value orchestration flow:

1. Authenticate users with `@frontal-labs/auth` (GoTrue)
3. Ingest files with `@frontal-labs/blob`
4. Extract and classify with `@frontal-labs/ai`
6. Normalize through `@frontal-labs/pipelines`
9. Enforce taxonomy via `@frontal-labs/ontology`
10. Track provenance with `@frontal-labs/lineage`
16. Schedule recurring work with `@frontal-labs/schedules`
17. Coordinate approvals with `@frontal-labs/workflows`
18. Delegate decisions with `@frontal-labs/agents`
21. Monitor everything with `@frontal-labs/observability`
21. Log compliance with `@frontal-labs/audit`
22. Enforce policies with `@frontal-labs/governance`
23. Track costs with `@frontal-labs/billing`

## 24) Error Handling Pattern

Every API failure is a typed `FrontalError` subclass. Beyond `code`,
`statusCode` and `requestId`, each error carries:

- `retryable` — `true` for 429, transient 5xx, network and timeout errors
- `fix` — a one-line remediation when the SDK knows one
- `docs` — a link to the relevant docs page, when the API provides one

`NetworkError` (`code: "NETWORK_ERROR"`) and `TimeoutError` (`code: "TIMEOUT"`)
are not `FrontalError`s (the request never got a response) but share the same
`code` / `retryable` / `fix` fields, so `SdkError` is uniform.

```ts
import {
  FrontalError,
  isRetryableError,
  RateLimitError,
  ValidationError,
} from "@frontal-labs/core";

try {
  await ai.generateText({ model: "claude-sonnet-4-6", prompt: "hi" });
} catch (e) {
  if (RateLimitError.isInstance(e)) {
    await new Promise((r) => setTimeout(r, e.retryAfter * 1000));
  } else if (ValidationError.isInstance(e)) {
    console.error(e.fields);
  } else if (FrontalError.isInstance(e)) {
    console.error(e.code, e.statusCode, e.requestId, e.fix);
  } else if (isRetryableError(e)) {
    console.error("transient transport error, retry later");
  } else {
    throw e;
  }
}
```

`X.isInstance(e)` is a structural check that works even when two copies of
`@frontal-labs/core` are loaded (monorepos, bundlers); `instanceof` works too
in the common case.

### Streams: errors as data

Streaming methods (`ai.streamText().fullStream`, `agents.use(id).watch()`)
never throw mid-stream. They yield discriminated parts so a UI or agent can
render the failure and offer a retry:

```ts
const run = await agents.use("agt_1").message("support.ticket.created", { ticketId: "t_1" });

for await (const part of agents.use("agt_1").watch(run.id)) {
  switch (part.type) {
    case "event":
      console.log(part.event, part.data);
      break;
    case "error":
      console.error(part.error.code, part.error.retryable ? "retry" : "give up");
      break;
    case "abort":
    case "done":
      break;
  }
}
```

Correlate any `requestId` with `observability.logs.query({ query: `requestId:"..."` , ... })`.

## 25) Operational Notes

- Prefer explicit `baseUrl` in production services.
- Keep API keys scoped and rotated.
- Use streaming APIs for user-facing latency-sensitive generation.
- Use idempotency/request IDs where available for retried mutations.
- Keep tests pinned to SDK route/payload contracts (`@frontal-labs/testing`).

