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
| `@frontal-labs/ai` | AI integration and utilities. |
| `@frontal-labs/agents` | AI agent integrations and workflows with LangChain, LangGraph, and Vercel AI SDK. |
| `@frontal-labs/functions` | Serverless functions orchestration. |
| `@frontal-labs/graph` | Graph database operations and semantic search. |
| `@frontal-labs/ontology` | Model deployment and management. |
| `@frontal-labs/pipelines` | Data pipeline orchestration. |
| `@frontal-labs/blob` | Scalable storage interactions. |
| `@frontal-labs/workflows` | Workflow automation and management. |
| `@frontal-labs/testing` | Test utilities, mock transport, and fixtures for package-level SDK tests. |
