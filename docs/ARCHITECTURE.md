# Architecture Overview

This SDK is designed as a modular monorepo, allowing for clear separation of
concerns and independent versioning of components.

## Core Components

### 1. Core (`@frontal-labs/core`)

Shared transport primitives and defaults used by all domain SDKs:
- API key/base URL configuration
- HTTP client, retries, and timeout behavior
- typed error mapping (NotFound, Unauthorized, Validation, Conflict, RateLimit,
  ServiceError, NetworkError, TimeoutError)
- pagination and polling utilities
- circuit breaker and key-case transformers

### 2. SDK (`@frontal-labs/sdk`)

Unified SDK client: `new Frontal({ apiKey })` (or `new Frontal(client)`) with
lazy-loaded, cached service getters (`f.ai`, `f.agents`, …). Validates config
at construction. Re-exports the (deprecated) env-driven service singletons
for back-compat and the most-used helpers (`tool`, `toUIMessageStreamResponse`,
`toApprovalStep`, error guards).

### 3. Testing (`@frontal-labs/testing`)

Reusable mocks used by package test suites and by consumers. Three levels, all
at the `fetch` boundary so real SDK code runs: route mocks (`createMockFetch`,
`createTestClient`, SSE via `simulateStream`, `{param}` wildcards, sequencing
via `times`), a model mock (`mockLanguageModel` — scripted OpenAI-format
responses), and scenarios (`createScenario` — ordered multi-step scripts with
`assertAllHit()`).

### 3a. React (`@frontal-labs/react`)

Thin hooks over the SDK: `useChat` (UI message stream protocol from
`@frontal-labs/ai/ui`), `useAgentRun`, `useWorkflowApprovals`. No framework
dependency beyond `react`.

### 3b. Docs as runtime

Every ```ts block in `README.md`, `packages/*/README.md`, `SKILL.md`,
`docs/TESTING.md`, `templates/*/README.md` and `examples/SDKS_GUIDE.md` is
extracted by `scripts/extract-examples.ts` and type-checked in CI
(`bun run test:examples`); the sdk quickstart also runs against mocks.
`docs/mcp.json` is generated from the same sources by
`scripts/generate-docs-manifest.ts` and checked for freshness.

### 4. AI (`@frontal-labs/ai`)

Unified type-safe access to LLMs, embeddings, and AI inference with support for
streaming responses.

### 5. Agents (`@frontal-labs/agents`)

Define, deploy, and observe AI agents with LangChain, LangGraph, and Vercel AI
SDK integration.

### 6. Audit (`@frontal-labs/audit`)

Audit trails, event logging, compliance checks, and CSV/JSON export.

### 7. Auth (`@frontal-labs/auth`)

GoTrue-compatible authentication with MFA, OAuth, SSO, and admin user
management.

### 8. Billing (`@frontal-labs/billing`)

Plans, subscriptions, invoices, usage metering, and payment methods.

### 9. Blob (`@frontal-labs/blob`)

Simple, scalable object storage compatible with Blob and S3 standard patterns.

### 10. Connectors (`@frontal-labs/connectors`)

Data ingestion connectors for enterprise data sources.

### 11. Datasets (`@frontal-labs/datasets`)

Dataset CRUD with versioning, data operations, and import/export.

### 12. Events (`@frontal-labs/events`)

Pub/sub event bus with client-side buffering, dead-letter queues, and schema
registry.

### 13. Workers (`@frontal-labs/workers`)

Deploy and invoke serverless workers on the Frontal edge runtime.

### 15. Governance (`@frontal-labs/governance`)

Policy management, RBAC (role-based access control), and data classification.

### 16. Graph (`@frontal-labs/graph`)

Business entity CRUD, traversal, time travel, and semantic search.

### 17. Integrations (`@frontal-labs/integrations`)

Execute actions in third-party applications.

### 18. Lineage (`@frontal-labs/lineage`)

Data lineage graphs, dependency tracing, and impact analysis.

### 19. Observability (`@frontal-labs/observability`)

Logs, metrics, traces, alerts, and dashboards with OTLP export.

### 20. Ontology (`@frontal-labs/ontology`)

Semantic model and schema management, migrations, and AI-powered inference.

### 22. Pipelines (`@frontal-labs/pipelines`)

Declarative data pipelines with substrate orchestration and graph entity
awareness.

### 24. Sandbox (`@frontal-labs/sandbox`)

Isolated code execution with streaming, snapshots, and file management.

### 25. Schedules (`@frontal-labs/schedules`)

Cron-based scheduling with local validation, run history, and manual triggers.

### 26. Webhooks (`@frontal-labs/webhooks`)

Endpoint management with HMAC signature verification, delivery tracking, and
stats.

### 29. Workflows (`@frontal-labs/workflows`)

Workflow orchestration with approvals and steps.

## Build System

We use **Turborepo** to manage our build pipeline. It provides:
- **Remote Caching**: Speeds up CI/CD pipeline.
- **Task Orchestration**: Runs tasks (build, lint, test) in the correct order
  based on dependency graphs.
- **Parallel Execution**: Maximizes CPU usage during builds.

## Dependency Management

**Bun** is our primary package manager and runtime. It offers:
- Fast dependency resolution and installation.
- Native TypeScript support.
- A built-in high-performance test runner.

## Release Strategy

We use **Changesets** to manage the versioning and publishing of our packages.
This ensures that only changed packages are versioned and published, with
automated changelog generation.
