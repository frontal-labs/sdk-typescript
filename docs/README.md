# Documentation

Welcome to the Frontal SDK documentation. This section provides comprehensive guides and references for working with the SDK.

## Available Documentation

### Core Documentation

- [**Architecture Overview**](./ARCHITECTURE.md) - Understanding the SDK's modular design and components
- [**Overview**](./OVERVIEW.md) - High-level introduction to the SDK and its packages
- [**Developer Guide**](./DEVELOPERS.md) - Development workflow and contribution guidelines
- [**Onboarding Guide**](./ONBOARDING.md) - Step-by-step guide for new contributors

### Development Resources

- [**Testing Guide**](./TESTING.md) - Testing strategies, tools, and best practices
- [**JSR Publishing**](./JSR_PUBLISHING.md) - Publishing packages to JavaScript Registry
- [**Roadmap**](./ROADMAP.md) - Project roadmap and future plans

### External Documentation

- [**Main README**](../README.md) - Project overview, setup, and quick start guide
- [**Contributing Guide**](../CONTRIBUTING.md) - Detailed contribution guidelines
- [**Code of Conduct**](../CODE_OF_CONDUCT.md) - Community guidelines

## Package Documentation

Each package in the monorepo contains its own documentation:

- **[@frontal-labs/core](../packages/core/)** - Shared client transport, retries, errors, and pagination
- **[@frontal-labs/sdk](../packages/sdk/)** - Unified SDK client for all Frontal services
- **[@frontal-labs/testing](../packages/testing/)** - Shared SDK testing helpers and fixtures
- **[@frontal-labs/ai](../packages/ai/)** - AI inference, embeddings, and streaming responses
- **[@frontal-labs/agents](../packages/agents/)** - AI agent integrations and workflows
- **[@frontal-labs/audit](../packages/audit/)** - Audit trails, event logging, and compliance checks
- **[@frontal-labs/auth](../packages/auth/)** - Authentication with MFA, OAuth, and SSO
- **[@frontal-labs/billing](../packages/billing/)** - Plans, subscriptions, invoices, and usage metering
- **[@frontal-labs/blob](../packages/blob/)** - Simple, scalable object storage
- **[@frontal-labs/connectors](../packages/connectors/)** - Data ingestion connectors for enterprise sources
- **[@frontal-labs/datasets](../packages/datasets/)** - Dataset CRUD with versioning and import/export
- **[@frontal-labs/events](../packages/events/)** - Pub/sub event bus with buffering and dead-letter queues
- **[@frontal-labs/flags](../packages/flags/)** - Feature flags with local evaluation and A/B experiments
- **[@frontal-labs/functions](../packages/functions/)** - Serverless functions orchestration
- **[@frontal-labs/governance](../packages/governance/)** - Policy management, RBAC, and data classification
- **[@frontal-labs/graph](../packages/graph/)** - Business entity CRUD, traversal, and semantic search
- **[@frontal-labs/integrations](../packages/integrations/)** - Execute actions in third-party applications
- **[@frontal-labs/lineage](../packages/lineage/)** - Data lineage graphs and impact analysis
- **[@frontal-labs/observability](../packages/observability/)** - Logs, metrics, traces, alerts, and dashboards
- **[@frontal-labs/ontology](../packages/ontology/)** - Semantic model and schema management
- **[@frontal-labs/organization](../packages/organization/)** - Multi-tenancy with tenants, teams, members, and roles
- **[@frontal-labs/pipelines](../packages/pipelines/)** - Declarative data pipelines with substrate orchestration
- **[@frontal-labs/queues](../packages/queues/)** - Job and message queues with retry and dead-letter handling
- **[@frontal-labs/sandbox](../packages/sandbox/)** - Isolated code execution with streaming and snapshots
- **[@frontal-labs/schedules](../packages/schedules/)** - Cron-based scheduling with local validation
- **[@frontal-labs/search](../packages/search/)** - Unified search across vectors, graph, and datasets
- **[@frontal-labs/vectors](../packages/vectors/)** - Embeddings store with similarity and hybrid search
- **[@frontal-labs/webhooks](../packages/webhooks/)** - Endpoint management with HMAC signature verification
- **[@frontal-labs/workflows](../packages/workflows/)** - Workflow orchestration with approvals and steps

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/frontal-labs/sdk-typescript/issues)
- **Discussions**: [Community discussions and Q&A](https://github.com/frontal-labs/sdk-typescript/discussions)
- **Documentation**: Browse the available documentation sections above

## Documentation Structure

This documentation is organized to serve different needs:

- **New Users**: Start with the main [README](../README.md) and [OVERVIEW](./OVERVIEW.md)
- **Developers**: Follow the [ONBOARDING](./ONBOARDING.md) guide and refer to [DEVELOPERS](./DEVELOPERS.md)
- **Contributors**: Review [CONTRIBUTING](../CONTRIBUTING.md) and [TESTING](./TESTING.md) guides
- **Architects**: Understand the system design from [ARCHITECTURE](./ARCHITECTURE.md)

All documentation follows the project's style guidelines and is kept in sync with the codebase.
