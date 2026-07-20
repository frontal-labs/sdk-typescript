<picture>
  <source srcset="./banner-dark.png" media="(prefers-color-scheme: dark)">
  <source srcset="./banner.png" media="(prefers-color-scheme: light)">
  <img src="./banner-dark.png" alt="Frontal Banner">
</picture>

# Frontal Typescript SDK

A modular SDK for building on Frontal with AI inference, agents, graph/ontology, workflows, pipelines, storage, and workers.

## Overview

This repository is a monorepo containing various packages designed to simplify the development of distributed systems. It leverages modern tooling like Bun, Turborepo, and Changesets for a seamless developer experience.

## Features

- **Modular Architecture**: Use only the packages you need.
- **Fast Development**: Powered by Bun and Turborepo for ultra-fast builds and tests.
- **Type-Safe**: Written entirely in TypeScript with strict type checking.
- **Automated Versioning**: Streamlined release process with Changesets.

## Packages

| Package | Description | Version |
| :--- | :--- | :--- |
| [`@frontal-labs/_core`](./packages/_core) | Shared client transport, auth, retries, pagination, and error types. | ![npm](https://img.shields.io/npm/v/@frontal-labs/_core) |
| [`@frontal-labs/ai`](./packages/ai) | AI integration and utilities. | ![npm](https://img.shields.io/npm/v/@frontal-labs/ai) |
| [`@frontal-labs/agents`](./packages/agents) | AI agent integrations and workflows. | ![npm](https://img.shields.io/npm/v/@frontal-labs/agents) |
| [`@frontal-labs/workers`](./packages/workers) | Serverless workers on the edge runtime. | ![npm](https://img.shields.io/npm/v/@frontal-labs/workers) |
| [`@frontal-labs/graph`](./packages/graph) | Graph database operations. | ![npm](https://img.shields.io/npm/v/@frontal-labs/graph) |
| [`@frontal-labs/ontology`](./packages/ontology) | Model deployment and management. | ![npm](https://img.shields.io/npm/v/@frontal-labs/ontology) |
| [`@frontal-labs/pipelines`](./packages/pipelines) | Data pipeline orchestration. | ![npm](https://img.shields.io/npm/v/@frontal-labs/pipelines) |
| [`@frontal-labs/blob`](./packages/blob) | Scalable storage interactions. | ![npm](https://img.shields.io/npm/v/@frontal-labs/blob) |
| [`@frontal-labs/workflows`](./packages/workflows) | Workflow automation and management. | ![npm](https://img.shields.io/npm/v/@frontal-labs/workflows) |
| [`@frontal-labs/_testing`](./packages/_testing) | Shared test harness, mocks, and fixtures for SDK packages. | ![npm](https://img.shields.io/npm/v/@frontal-labs/_testing) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3.8 or later)
- [Node.js](https://nodejs.org) (v18 or later) - for compatibility
- [Git](https://git-scm.com) - for version control

### Development Setup

#### Option 1: Standard Setup

```bash
# Clone the repository
git clone https://github.com/frontal-labs/sdk-typescript.git
cd sdk-typescript

# Install dependencies
bun install

# Initial setup
bun run setup
```

#### Option 2: Nix Development Environment

```bash
# Enter Nix development shell
nix develop

# Or use flakes directly
nix shell
```

### Development Commands

```bash
# Build all packages
bun run build

# Run tests (with Vitest)
bun run test
bun run test:watch
bun run test:coverage

# Lint and format
bun run lint
bun run lint:fix
bun run format

# Type checking
bun run type-check

# Sync API/AI contract artifacts from local source specs
bun run contract:sync

# Endpoint snapshot + OpenAPI conformance check (fails on drift)
bun run contract:endpoints

# Conformance report only (non-failing)
bun run contract:report

# Migration matrix from current SDK -> contract paths
bun run contract:matrix

# Clean build artifacts
bun run clean
```

### Environment Configuration

Copy `.env.example` to `.env` and configure your environment:

```bash
cp .env.example .env
```

Key environment variables:
- `FRONTAL_API_KEY` - Your API key
- `FRONTAL_API_URL` - Base API URL (default `https://api.frontal.dev/v1`)
- `FRONTAL_AI_API_URL` - AI Gateway URL (default `https://ai.frontal.dev`)
- `FRONTAL_AGENTS_API_URL` - Optional override for Agents SDK
- `FRONTAL_GRAPH_API_URL` - Optional override for Graph SDK
- `FRONTAL_ONTOLOGY_API_URL` - Optional override for Ontology SDK
- `FRONTAL_PIPELINES_API_URL` - Optional override for Pipelines SDK
- `FRONTAL_WORKFLOWS_API_URL` - Optional override for Workflows SDK
- `FRONTAL_FUNCTIONS_API_URL` - Optional override for Functions SDK
- `FRONTAL_BLOB_API_URL` - Optional override for Blob SDK
- `NODE_ENV` - Environment (development/test/production)
- `DEBUG` - Enable debug logging (optional)

### Live Backend Compatibility Check

Run an opt-in smoke validation against a live backend:

```bash
FRONTAL_API_KEY=frt_... bun run test:live
```

Optional inputs:
- `FRONTAL_GRAPH_ENTITY_TYPE` - required for `graph.query` smoke check
- `FRONTAL_BLOB_BUCKET` - required for `blob.list` smoke check

## Documentation

Detailed documentation for each package can be found in their respective directories:
- [AI](./packages/ai/README.md)
- [Agents](./packages/agents/README.md)
- [Core](./packages/_core/README.md)
- [Workers](./packages/workers/README.md)
- [Graph](./packages/graph/README.md)
- [Models](./packages/ontology/README.md)
- [Pipelines](./packages/pipelines/README.md)
- [Storage](./packages/blob/README.md)
- [Workflows](./packages/workflows/README.md)
- [Testing](./packages/_testing/README.md)

General project documentation is available in the [`docs`](./docs) folder.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for more details.

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](./LICENSE.md) file for details.
