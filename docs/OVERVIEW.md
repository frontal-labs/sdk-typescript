# Overview

This repository is a monorepo containing various packages designed to simplify the development of distributed systems. It leverages modern tooling like Bun, Turborepo, and Changesets for a seamless developer experience.

## Features

- **Modular Architecture**: Use only the packages you need.
- **Fast Development**: Powered by Bun and Turborepo for ultra-fast builds and tests.
- **Type-Safe**: Written entirely in TypeScript with strict type checking.
- **Automated Versioning**: Streamlined release process with Changesets.

## Packages

| Package | Description |
| :--- | :--- |
| `@frontal-labs/core` | Shared transport, auth, retries, pagination, and typed errors used by all SDKs. |
| `@frontal-labs/sdk` | Unified SDK client aggregating all Frontal services with lazy-loaded accessors. |
| `@frontal-labs/testing` | Test utilities, mock transport, and fixtures for package-level SDK tests. |
| `@frontal-labs/ai` | AI inference, embeddings, and streaming responses. |
| `@frontal-labs/agents` | AI agent integrations and workflows with LangChain, LangGraph, and Vercel AI SDK. |
| `@frontal-labs/audit` | Audit trails, event logging, compliance checks, and CSV/JSON export. |
| `@frontal-labs/auth` | GoTrue-compatible authentication with MFA, OAuth, SSO, and admin user management. |
| `@frontal-labs/billing` | Plans, subscriptions, invoices, usage metering, and payment methods. |
| `@frontal-labs/blob` | Simple, scalable object storage compatible with Blob and S3. |
| `@frontal-labs/connectors` | Data ingestion connectors for enterprise data sources. |
| `@frontal-labs/datasets` | Dataset CRUD with versioning, data operations, and import/export. |
| `@frontal-labs/events` | Pub/sub event bus with client-side buffering, dead-letter queues, and schema registry. |
| `@frontal-labs/flags` | Feature flags with local evaluation, targeting rules, gradual rollouts, and A/B experiments. |
| `@frontal-labs/functions` | Deploy and manage serverless functions on Frontal. |
| `@frontal-labs/governance` | Policy management, RBAC, and data classification. |
| `@frontal-labs/graph` | Business entity CRUD, traversal, time travel, and semantic search. |
| `@frontal-labs/integrations` | Execute actions in third-party applications. |
| `@frontal-labs/lineage` | Data lineage graphs, dependency tracing, and impact analysis. |
| `@frontal-labs/observability` | Logs, metrics, traces, alerts, and dashboards with OTLP export. |
| `@frontal-labs/ontology` | Semantic model and schema management, migrations, and AI-powered inference. |
| `@frontal-labs/organization` | Multi-tenancy with tenants, teams, members, roles, and invitations. |
| `@frontal-labs/pipelines` | Declarative data pipelines with substrate orchestration. |
| `@frontal-labs/queues` | Job and message queues with scheduling, retry, and dead-letter handling. |
| `@frontal-labs/sandbox` | Isolated code execution with streaming, snapshots, and file management. |
| `@frontal-labs/schedules` | Cron-based scheduling with local validation, run history, and manual triggers. |
| `@frontal-labs/search` | Unified search across vectors, graph, and datasets with hybrid mode. |
| `@frontal-labs/vectors` | Embeddings store with similarity search, hybrid search, and AI bridge. |
| `@frontal-labs/webhooks` | Endpoint management with HMAC signature verification and delivery tracking. |
| `@frontal-labs/workflows` | Workflow orchestration with approvals and steps. |
