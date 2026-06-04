# Architecture Overview

This SDK is designed as a modular monorepo, allowing for clear separation of concerns and independent versioning of components.

## Core Components

### 1. Core (`@frontal-labs/core`)

Shared transport primitives and defaults used by all domain SDKs:
- API key/base URL configuration
- HTTP client, retries, and timeout behavior
- typed error mapping
- pagination and polling utilities

### 2. AI (`@frontal-labs/ai`)

Handles interactions with AI models, including inference, prompt management, and streaming responses.

### 3. Agents (`@frontal-labs/agents`)

AI agent integrations and workflows with support for LangChain, LangGraph, and Vercel AI SDK.

### 4. Functions (`@frontal-labs/functions`)

A serverless functions orchestration layer, enabling developers to deploy and trigger functions easily.

### 5. Graph (`@frontal-labs/graph`)

Graph database operations, entity CRUD, traversal, time travel, and semantic search capabilities.

### 6. Models (`@frontal-labs/ontology`)

Model deployment and management for machine learning models.

### 7. Pipelines (`@frontal-labs/pipelines`)

Data pipeline orchestration for complex data processing workflows.

### 8. Storage (`@frontal-labs/blob`)

An interface for interacting with various storage providers (S3, local, etc.) in a unified way.

### 9. Workflows (`@frontal-labs/workflows`)

Workflow automation and management for complex business processes.

### 10. Testing (`@frontal-labs/testing`)

Reusable mock clients, fixtures, and helper utilities used by package test suites to enforce consistent behavior.

## Build System

We use **Turborepo** to manage our build pipeline. It provides:
- **Remote Caching**: Speeds up CI/CD pipeline.
- **Task Orchestration**: Runs tasks (build, lint, test) in the correct order based on dependency graphs.
- **Parallel Execution**: Maximizes CPU usage during builds.

## Dependency Management

**Bun** is our primary package manager and runtime. It offers:
- Fast dependency resolution and installation.
- Native TypeScript support.
- A built-in high-performance test runner.

## Release Strategy

We use **Changesets** to manage the versioning and publishing of our packages. This ensures that only changed packages are versioned and published, with automated changelog generation.
