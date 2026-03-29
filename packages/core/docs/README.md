# @frontal/core

Frontal platform — shared client, schemas, and utilities.

## Overview

The `@frontal/core` package provides the foundational SDK for interacting with the Frontal platform. It includes:

- **FrontalClient**: Main SDK client for API interactions
- **HttpClient**: Low-level HTTP client with retry logic and error handling
- **Configuration**: Type-safe configuration management with Zod schemas
- **Error Handling**: Comprehensive error classes for different API error types
- **Pagination**: Utilities for handling paginated API responses
- **Schemas**: Zod schemas for type-safe API responses and requests
- **Utilities**: Retry logic, environment variable management, and common constants

## Installation

```bash
bun add @frontal/core
# or
npm install @frontal/core
```

## Quick Start

```typescript
import { FrontalClient } from '@frontal/core'

const client = new FrontalClient({
  apiKey: 'frt_1234567890abcdef',
  environment: 'development'
})

// Make API requests
const users = await client.get('/users')
const user = await client.post('/users', { name: 'John Doe' })
```

## Key Features

- **Type Safety**: Full TypeScript support with Zod schemas
- **Error Handling**: Specific error classes for different HTTP status codes
- **Retry Logic**: Built-in exponential backoff and retry strategies
- **Pagination**: First-class support for paginated responses
- **Streaming**: Server-Sent Events (SSE) support
- **Environment Management**: Secure environment variable handling

## Documentation

- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Architecture](./ARCHITECTURE.md) - Package architecture and design
- [Overview](./OVERVIEW.md) - Detailed feature overview

