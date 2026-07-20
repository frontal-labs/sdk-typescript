# frontal/core Overview

## Architecture Overview

The `frontal/core` package is built around a modular architecture that provides a solid foundation for interacting with the Frontal platform APIs.

### Core Components

### FrontalClient

The main entry point for SDK usage. Provides a high-level interface for making API requests with built-in error handling, retries, and type safety.

```typescript
import { FrontalClient } from 'frontal/core'

const client = new FrontalClient({
  apiKey: 'frt_1234567890abcdef',
  environment: 'development',
  timeout: 30000
})
```

### HttpClient

Low-level HTTP client that handles the actual request/response cycle, including:
- Request building with proper headers and authentication
- Response parsing and validation
- Retry logic with exponential backoff
- Error handling and mapping

### Configuration Management

Type-safe configuration using Zod schemas ensures that all required fields are present and properly validated:

```typescript
import { clientConfigSchema, type ClientConfigInput } from 'frontal/core'

const config: ClientConfigInput = {
  apiKey: 'frt_1234567890abcdef',
  environment: 'development'
}

const validatedConfig = clientConfigSchema.parse(config)
```

## Key Features

### 1. Type Safety with Zod

All API schemas are defined using Zod, providing runtime validation and TypeScript type inference:

```typescript
import { z } from 'zod'
import { HttpClient } from 'frontal/core'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
})

const user = await client.get('/users/123', userSchema)
// TypeScript knows `user` has id, name, and email properties
```

### 2. Comprehensive Error Handling

Specific error classes for different HTTP status codes:

- `NotFoundError` (404) - Resource not found
- `UnauthorizedError` (401) - Authentication failed
- `ForbiddenError` (403) - Insufficient permissions
- `ValidationError` (400) - Request validation failed
- `ConflictError` (409) - Resource conflict
- `RateLimitError` (429) - Rate limit exceeded
- `ServiceError` (5xx) - Server-side errors
- `NetworkError` - Network connectivity issues

```typescript
try {
  await client.get('/users/999')
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('User not found:', error.requestId)
  } else if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter} seconds`)
  }
}
```

### 3. Pagination Support

Built-in utilities for handling paginated responses:

```typescript
import { createPageResult, type PageResult } from 'frontal/core'

const users = await client.get('/users', pageResultSchema)
// users is a PageResult<User> with:
// - data: User[] - Current page items
// - pagination: PaginationMeta - Pagination info
// - nextPage(): Promise<PageResult<User> | null> - Get next page
// - all(): Promise<User[]> - Get all items across pages
// - Async iterator support
```

### 4. Retry Logic

Automatic retry with configurable strategies:

```typescript
const client = new FrontalClient({
  apiKey: 'frt_1234567890abcdef',
  maxRetries: 3,
  retryDelay: 1000
})

// Retries are automatically applied for:
// - Rate limit errors (429)
// - Server errors (500, 502, 503, 504)
// - Network timeouts
```

### 5. Server-Sent Events (SSE)

Support for streaming responses:

```typescript
// Stream real-time events
for await (const event of client.stream('/events')) {
  console.log('Event:', event.type, event.data)
}
```

### 6. Environment Variable Management

Secure handling of sensitive configuration:

```typescript
import { keys } from 'frontal/core'

// Automatically loads from environment variables
// with proper validation and type safety
const config = keys.client.parse(process.env)
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | Required | Frontal API key (must start with `frt_`) |
| `baseUrl` | `string` | `https://api.frontal.dev/v1` | API base URL |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `retryDelay` | `number` | `1000` | Base retry delay in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Additional headers |
| `environment` | `string` | `'production'` | Environment name |
| `debug` | `boolean` | `false` | Enable debug logging |
| `fetch` | `typeof fetch` | `global fetch` | Custom fetch implementation |
| `logger` | `Logger` | `undefined` | Custom logger functions |

## Best Practices

### 1. Use Type-Safe Schemas

Always define and use Zod schemas for API responses:

```typescript
const createUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime()
})

const user = await client.post('/users', userData, createUserSchema)
```

### 2. Handle Errors Gracefully

Use specific error classes for better error handling:

```typescript
try {
  const result = await client.get('/resource')
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.log('Field errors:', error.fields)
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
    await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000))
    // Retry the request
  } else if (error instanceof NetworkError) {
    // Handle network issues
    console.log('Network error:', error.cause)
  }
}
```

### 3. Use Pagination for Large Datasets

For endpoints that return large datasets, use pagination utilities:

```typescript
// Get all users efficiently
const allUsers: User[] = []
for await (const user of client.get('/users', pageResultSchema)) {
  allUsers.push(user)
}

// Or use the all() method
const users = await client.get('/users', pageResultSchema)
const allUsers = await users.all()
```

### 4. Configure Timeouts Appropriately

Set appropriate timeouts based on your use case:

```typescript
const client = new FrontalClient({
  apiKey: 'frt_1234567890abcdef',
  timeout: 5000  // 5 seconds for fast operations
})

const bulkClient = new FrontalClient({
  apiKey: 'frt_1234567890abcdef',
  timeout: 60000  // 60 seconds for bulk operations
})
```

### 5. Use Environment Variables for Sensitive Data

Never hardcode API keys or other sensitive configuration:

```typescript
import { keys } from 'frontal/core'

const config = keys.client.parse(process.env)
const client = new FrontalClient(config)
```
