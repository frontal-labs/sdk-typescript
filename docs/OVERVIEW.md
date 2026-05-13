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
| `@frontal/core` | Shared transport, auth, retries, pagination, and typed errors used by all SDKs. |
| `@frontal/ai` | AI integration and utilities. |
| `@frontal/agents` | AI agent integrations and workflows with LangChain, LangGraph, and Vercel AI SDK. |
| `@frontal/functions` | Serverless functions orchestration. |
| `@frontal/graph` | Graph database operations and semantic search. |
| `@frontal/ontology` | Model deployment and management. |
| `@frontal/pipelines` | Data pipeline orchestration. |
| `@frontal/blob` | Scalable storage interactions. |
| `@frontal/workflows` | Workflow automation and management. |
| `@frontal/testing` | Test utilities, mock transport, and fixtures for package-level SDK tests. |
