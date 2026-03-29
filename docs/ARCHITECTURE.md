# Architecture Overview

This SDK is designed as a modular monorepo, allowing for clear separation of concerns and independent versioning of components.

## Core Components

### 1. AI (`@frontal/ai`)

Handles interactions with AI models, including inference, prompt management, and streaming responses.

### 2. Agents (`@frontal/agents`)

AI agent integrations and workflows with support for LangChain, LangGraph, and Vercel AI SDK.

### 3. Core (`@frontal/core`)

Core HTTP client and utilities that provide the foundation for all other packages.

### 4. Functions (`@frontal/functions`)

A serverless functions orchestration layer, enabling developers to deploy and trigger functions easily.

### 5. Flags (`@frontal/flags`)

Feature flags and configuration, enabling runtime toggles and gradual rollouts.

### 6. Graph (`@frontal/graph`)

Graph database operations, entity CRUD, traversal, time travel, and semantic search capabilities.

### 7. Logging (`@frontal/logging`)

Structured logging utilities for application and request-level logs.

### 8. Models (`@frontal/ontology`)

Model deployment and management for machine learning models.

### 9. Notifications (`@frontal/notifications`)

Notification delivery (email, push, etc.) and management.

### 10. Pipelines (`@frontal/pipelines`)

Data pipeline orchestration for complex data processing workflows.

### 11. Storage (`@frontal/blob`)

An interface for interacting with various storage providers (S3, local, etc.) in a unified way.

### 12. Testing (`@frontal/testing`)

Shared testing utilities and helpers used across all packages.

### 13. Workflows (`@frontal/workflows`)

Workflow automation and management for complex business processes.

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
