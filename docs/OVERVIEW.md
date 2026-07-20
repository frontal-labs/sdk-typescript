# Overview

This repository is a monorepo containing various packages designed to simplify
the development of distributed systems. It leverages modern tooling like Bun,
Turborepo, and Changesets for a seamless developer experience.

## Features

- **Modular Architecture**: Use only the packages you need.
- **Fast Development**: Powered by Bun and Turborepo for fast builds and tests.
- **Type-Safe**: Written entirely in TypeScript with strict type checking.
- **Automated Versioning**: Streamlined release process with Changesets.

## Packages

| Package | Description |
| :--- | :--- |
| `frontal/core` | Shared transport, auth, retries, and typed errors. |
| `@frontal-labs/sdk` | Unified client for all Frontal services. |
| `frontal/testing` | Test mocks, transport, and fixtures for SDK tests. |
| `@frontal-labs/ai` | AI inference, embeddings, and streaming. |
| `@frontal-labs/agents` | AI agent integrations with LangChain and Vercel AI. |
| `@frontal-labs/audit` | Audit trails and compliance checks. |
| `@frontal-labs/auth` | MFA, OAuth, SSO, and admin user management. |
| `@frontal-labs/billing` | Plans, subscriptions, and usage metering. |
| `@frontal-labs/blob` | Object storage compatible with Blob and S3. |
| `@frontal-labs/connectors` | Data connectors. |
| `@frontal-labs/data` | Data platform subdomains (aggregations, quality, query, serving, streams, …). |
| `@frontal-labs/datasets` | Dataset ingest, catalog, and schemas. |
| `@frontal-labs/events` | Pub/sub event bus with DLQ support. |
| `@frontal-labs/workers` | Serverless workers on the edge runtime. |
| `@frontal-labs/governance` | Policy management and RBAC. |
| `@frontal-labs/graph` | Entity CRUD and semantic search. |
| `@frontal-labs/integrations` | Third-party integrations. |
| `@frontal-labs/lineage` | Data lineage and impact analysis. |
| `@frontal-labs/observability` | Logs, metrics, and traces. |
| `@frontal-labs/ontology` | Schema management and inference. |
| `@frontal-labs/pipelines` | Declarative data pipelines. |
| `@frontal-labs/sandbox` | Isolated code execution. |
| `@frontal-labs/schedules` | Cron-based scheduling. |
| `@frontal-labs/webhooks` | Endpoint management. |
| `@frontal-labs/workflows` | Workflow orchestration. |
