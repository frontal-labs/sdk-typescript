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
- `@frontal-labs/auth`
- `@frontal-labs/organization`
- `@frontal-labs/observability`
- `@frontal-labs/events`
- `@frontal-labs/flags`
- `@frontal-labs/audit`
- `@frontal-labs/governance`
- `@frontal-labs/billing`
- `@frontal-labs/webhooks`
- `@frontal-labs/queues`
- `@frontal-labs/schedules`
- `@frontal-labs/sandbox`
- `@frontal-labs/datasets`
- `@frontal-labs/vectors`
- `@frontal-labs/lineage`

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

## 13) `@frontal-labs/organization`

### What it does

Multi-tenancy and team management extending GoTrue's identity model:

- organization CRUD with plan management
- tenant (workspace) creation and listing
- team management with member assignment
- member invitations and role updates
- role definitions with permission arrays
- all GoTrue user ID references for unified identity

### Use cases

- SaaS multi-tenant workspace provisioning
- team-based access control within organizations
- role-based permission assignment
- member lifecycle (invite → accept → role change → remove)

### Example: tenants and teams

```ts
import { createOrganizationClient } from "@frontal-labs/organization";

const org = createOrganizationClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const orgData = await org.get();

const tenant = await org.tenants.create({
  name: "Engineering",
  slug: "engineering",
  description: "Engineering department tenant"
});

const team = await org.teams.create({
  name: "Platform",
  description: "Platform engineering team",
  tenant_id: tenant.id
});

const members = await org.members.list();
await org.teams.addMember(team.id, members.data[0].id);
```

### Example: role and permission management

```ts
const role = await org.roles.create({
  name: "Pipeline Operator",
  description: "Can trigger and manage pipelines",
  permissions: [
    { resource: "pipelines", action: "read" },
    { resource: "pipelines", action: "update" },
    { resource: "pipelines.runs", action: "create" }
  ]
});

const invitation = await org.invitations.create({
  email: "designer@example.com",
  role: "member"
});

await org.members.updateRole("mbr_ghi012", "admin");
```

## 14) `@frontal-labs/observability`

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

## 15) `@frontal-labs/events`

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

### Example: dead-letter recovery

```ts
const dlq = await events.deadLetter.list({ limit: 25 });
for await (const evt of dlq) {
  await events.deadLetter.replay(evt.id);
}
```

## 16) `@frontal-labs/flags`

### What it does

Feature flag and experimentation SDK:

- flag CRUD with type support (boolean, string, number)
- evaluation with user/org/tenant context
- bulk evaluation for multiple flags
- targeting rules with attribute operators
- gradual rollout management (pause/resume)
- A/B experiment lifecycle and result analysis

### Use cases

- gradual feature rollouts
- kill switches for emergency disabling
- A/B testing with variant analysis
- per-tenant feature enablement

### Example: evaluate and rollout

```ts
import { createFlagsClient } from "@frontal-labs/flags";

const flags = createFlagsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const flag = await flags.flags.create({
  key: "new-dashboard",
  name: "New Dashboard UI",
  type: "boolean",
  default_value: false
});

const result = await flags.evaluate("new-dashboard", {
  user_id: "usr_abc",
  attributes: { beta_tester: true, region: "us-east" }
});

const bulk = await flags.evaluateBulk(
  ["new-dashboard", "dark-mode"],
  { organization_id: "org_123" }
);
```

### Example: A/B experiment

```ts
const exp = await flags.experiments.create({
  flag_id: flag.id,
  name: "Search Ranking Test",
  variants: [
    { name: "control", value: "bm25", percentage: 50 },
    { name: "treatment", value: "neural", percentage: 50 }
  ]
});

await flags.experiments.start(exp.id);
// ... wait for data ...
await flags.experiments.stop(exp.id);

const results = await flags.experiments.results(exp.id);
for (const v of results.variants) {
  console.log(`${v.name}: ${v.sample_size} samples, ${v.conversion_rate} rate`);
}
```

## 17) `@frontal-labs/audit`

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

## 18) `@frontal-labs/governance`

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
  rules: [{
    id: "rule_1",
    resource: "datasets.*",
    actions: ["read", "export"],
    effect: "deny",
    conditions: { "resource.visibility": "public" }
  }],
  enabled: true,
  priority: 10
});

const result = await gov.evaluatePolicy(policy.id, {
  user_id: "usr_abc",
  resource: { type: "dataset", id: "ds_1", visibility: "public" }
});

const access = await gov.rbac.checkAccess({
  user_id: "usr_abc",
  resource: "pipelines.ppl_1",
  action: "update"
});

await gov.rbac.createBinding({
  user_id: "usr_abc",
  role: "pipeline-operator",
  resource: "pipelines.ppl_1"
});
```

## 19) `@frontal-labs/billing`

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

const plans = await billing.plans.list();
const sub = await billing.subscriptions.get();

await billing.subscriptions.update({ plan_id: "plan_pro" });

const invoices = await billing.invoices.list();
for await (const inv of invoices) {
  console.log(`${inv.id}: ${inv.amount} ${inv.currency} [${inv.status}]`);
}

await billing.usage.report([
  { metric: "api_calls", quantity: 15000 },
  { metric: "storage_gb", quantity: 42.5 }
]);

const methods = await billing.paymentMethods.list();
```

## 20) `@frontal-labs/webhooks`

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

## 21) `@frontal-labs/queues`

### What it does

Job and message queue SDK:

- queue CRUD with concurrency and retention settings
- job enqueue with optional scheduling
- job listing by status with cancel and retry
- queue pause/resume for maintenance

### Use cases

- async task processing (emails, exports, notifications)
- worker pool management
- scheduled/delayed job execution
- dead-letter handling and retry

### Example: enqueue and manage jobs

```ts
import { createQueuesClient } from "@frontal-labs/queues";

const queues = createQueuesClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const queue = await queues.queues.create({
  name: "email-notifications",
  max_concurrency: 5
});

const job = await queues.jobs.enqueue(queue.id, {
  to: "user@example.com",
  template: "welcome",
  data: { name: "Alice" }
});

const pending = await queues.jobs.list(queue.id, { status: "pending" });

await queues.queues.pause(queue.id);
await queues.queues.resume(queue.id);
```

## 22) `@frontal-labs/schedules`

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

## 23) `@frontal-labs/sandbox`

### What it does

Isolated execution environment SDK:

- sandbox lifecycle (create, start, stop, delete, snapshot)
- code execution with language support (JavaScript, Python, TypeScript)
- SSE streaming of execution output
- file management within sandbox workspace
- template-based environment provisioning
- CPU/memory limits and network policy control

### Use cases

- secure code execution for user-submitted scripts
- data processing in isolated environments
- CI/CD pipeline execution nodes
- AI agent tool execution sandboxes

### Example: create and execute

```ts
import { createSandboxClient } from "@frontal-labs/sandbox";

const sandbox = createSandboxClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const tmpl = await sandbox.templates.list();
const sbx = await sandbox.sandboxes.create({
  name: "data-processing",
  template_id: tmpl.data[0].id,
  cpu_limit: "2",
  memory_limit: "1Gi",
  timeout_seconds: 300
});

await sandbox.sandboxes.start(sbx.id);

const exec = await sandbox.executions.execute(sbx.id, {
  code: `print(json.dumps({"processed": True, "records": 42}))`,
  language: "python"
});

await sandbox.files.upload(sbx.id, "/workspace/input.csv", "col1,col2\n1,2");

const snap = await sandbox.sandboxes.snapshot(sbx.id);
await sandbox.sandboxes.stop(sbx.id);
```

## 24) `@frontal-labs/datasets`

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

### Example: datasets and versioning

```ts
import { createDatasetsClient } from "@frontal-labs/datasets";

const datasets = createDatasetsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const ds = await datasets.datasets.create({
  name: "user_events",
  description: "User interaction events"
});

await datasets.data.insert(ds.id, [
  { user_id: "usr_1", event: "page_view", page: "/home" },
  { user_id: "usr_2", event: "click", element: "signup" },
  { user_id: "usr_1", event: "purchase", amount: 49.99 }
]);

const results = await datasets.data.query(ds.id, {
  where: { event: "purchase" },
  limit: 10
});

const version = await datasets.versions.create(ds.id);
const diff = await datasets.versions.compare(ds.id, "1", "2");
const stats = await datasets.stats.get(ds.id);
```

## 25) `@frontal-labs/vectors`

### What it does

Vector embeddings and similarity search SDK:

- index creation with dimensions and distance metric (cosine, euclidean, dot_product)
- vector upsert, retrieval, and deletion (single + batch)
- similarity search (top-k nearest neighbors)
- hybrid search (vector + text)

### Use cases

- semantic search and RAG pipelines
- recommendation systems
- image/text similarity matching
- anomaly detection via embedding distance

### Example: index and search

```ts
import { createVectorsClient } from "@frontal-labs/vectors";

const vectors = createVectorsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const index = await vectors.indexes.create({
  name: "products",
  dimensions: 1536,
  metric: "cosine"
});

await vectors.vectors.upsert(index.id, [
  { id: "prod_1", values: embedding1, metadata: { name: "Red Shoes", price: 59.99 } },
  { id: "prod_2", values: embedding2, metadata: { name: "Blue Sneakers", price: 79.99 } }
]);

const results = await vectors.search.search(index.id, {
  vector: queryEmbedding,
  top_k: 5
});

const hybrid = await vectors.search.hybridSearch(index.id, {
  vector: queryEmbedding,
  text: "red shoes",
  top_k: 3
});
```

### What it does

External data source connector SDK:

- connector CRUD with typed configuration
- connection testing
- sync job lifecycle (start, monitor, cancel)
- connector type catalog (available source types and their config schemas)

### Use cases

- database ingestion (PostgreSQL, MySQL, MongoDB)
- SaaS data sync (Salesforce, Stripe, HubSpot)
- API-based data imports
- periodic data replication

### Example: sync from PostgreSQL

```ts
import { createConnectorsClient } from "@frontal-labs/connectors";

const connectors = createConnectorsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const types = await connectors.types.list();

const conn = await connectors.connectors.create({
  name: "Production DB",
  type: "postgresql",
  config: {
    host: "db.internal",
    port: 5432,
    database: "analytics",
    ssl: true
  }
});

const test = await connectors.connectors.test(conn.id);

const sync = await connectors.sync.start(conn.id);

const syncs = await connectors.sync.list(conn.id);
for await (const s of syncs) {
  console.log(`${s.id}: ${s.status} (${s.rows_synced ?? 0} rows)`);
}
```

### What it does

Managed third-party integration SDK:

- integration catalog browsing
- integration CRUD with configuration
- OAuth authorization flow (authorize, callback, refresh, revoke)
- integration health and status

### Use cases

- Slack/Discord/Teams notification setup
- GitHub/GitLab repository integration
- OAuth-based SaaS connections
- integration marketplace implementations

### Example: OAuth integration

```ts
import { createIntegrationsClient } from "@frontal-labs/integrations";

const integrations = createIntegrationsClient({
  apiKey: process.env.FRONTAL_API_KEY!
});

const catalog = await integrations.catalog.list();

const integration = await integrations.integrations.create({
  name: "Team Notifications",
  type: "slack",
  config: { channel: "#alerts" }
});

const auth = await integrations.auth.authorize(
  integration.id,
  "https://myapp.com/oauth/callback"
);
// Redirect user to auth.authorize_url, then:
// await integrations.auth.callback(integration.id, "auth_code_from_provider");

await integrations.auth.refresh(integration.id);
await integrations.auth.revoke(integration.id);
```

## 26) `@frontal-labs/lineage`

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

## 27) End-to-End Production Pattern

A common high-value orchestration flow:

1. Authenticate users with `@frontal-labs/auth` (GoTrue)
2. Scope access via `@frontal-labs/organization` tenants and teams
3. Ingest files with `@frontal-labs/blob`
4. Extract and classify with `@frontal-labs/ai`
6. Normalize through `@frontal-labs/pipelines`
7. Store structured data in `@frontal-labs/datasets`
8. Index embeddings in `@frontal-labs/vectors`
9. Persist relationships via `@frontal-labs/graph`
10. Enforce taxonomy via `@frontal-labs/ontology`
11. Track provenance with `@frontal-labs/lineage`
12. Gate features with `@frontal-labs/flags`
13. Communicate across services with `@frontal-labs/events`
15. Process async jobs through `@frontal-labs/queues`
16. Schedule recurring work with `@frontal-labs/schedules`
17. Execute isolated code in `@frontal-labs/sandbox`
18. Coordinate approvals with `@frontal-labs/workflows`
19. Delegate decisions with `@frontal-labs/agents`
20. Execute specialized logic in `@frontal-labs/functions`
21. Monitor everything with `@frontal-labs/observability`
22. Log compliance with `@frontal-labs/audit`
23. Enforce policies with `@frontal-labs/governance`
24. Track costs with `@frontal-labs/billing`

## 28) Error Handling Pattern

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

## 29) Operational Notes

- Prefer explicit `baseUrl` in production services.
- Keep API keys scoped and rotated.
- Use streaming APIs for user-facing latency-sensitive generation.
- Use idempotency/request IDs where available for retried mutations.
- Keep tests pinned to SDK route/payload contracts (`@frontal-labs/testing`).

