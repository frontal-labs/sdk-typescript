# @frontal-labs/core API Reference

## Table of Contents

- [Classes](#classes)
  - [FrontalClient](#frontalclient)
  - [HttpClient](#httpclient)
- [Error Classes](#error-classes)
- [Configuration](#configuration)
- [Types](#types)
- [Schemas](#schemas)
- [Utilities](#utilities)
- [Constants](#constants)

## Classes

### FrontalClient

Main SDK client for interacting with the Frontal API.

#### Constructor

```typescript
constructor(config: ClientConfigOutput)
```

**Parameters**:
- `config` - Validated client configuration

**Example**:
```typescript
import { FrontalClient, clientConfigSchema } from '@frontal-labs/core'

const config = clientConfigSchema.parse({
  apiKey: 'frt_1234567890abcdef',
  environment: 'development'
})

const client = new FrontalClient(config)
```

#### Methods

##### get

Makes a GET request to the API.

```typescript
async get<T>(path: string, schema?: z.ZodType<T>): Promise<T>
```

**Parameters**:
- `path` - API endpoint path
- `schema` - Optional Zod schema for response validation

**Returns**: `Promise<T>` - Response data

**Example**:
```typescript
const user = await client.get('/users/123', userSchema)
const users = await client.get('/users')
```

##### post

Makes a POST request to the API.

```typescript
async post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

**Parameters**:
- `path` - API endpoint path
- `body` - Optional request body data
- `schema` - Optional Zod schema for response validation

**Returns**: `Promise<T>` - Response data

**Example**:
```typescript
const user = await client.post('/users', { 
  name: 'John Doe', 
  email: 'john@example.com' 
}, userSchema)
```

##### put

Makes a PUT request to the API.

```typescript
async put<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

**Parameters**:
- `path` - API endpoint path
- `body` - Optional request body data
- `schema` - Optional Zod schema for response validation

**Returns**: `Promise<T>` - Response data

**Example**:
```typescript
const updatedUser = await client.put('/users/123', { 
  name: 'Jane Doe' 
}, userSchema)
```

##### patch

Makes a PATCH request to the API.

```typescript
async patch<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

**Parameters**:
- `path` - API endpoint path
- `body` - Optional request body data
- `schema` - Optional Zod schema for response validation

**Returns**: `Promise<T>` - Response data

**Example**:
```typescript
const updatedUser = await client.patch('/users/123', { 
  name: 'Jane Doe' 
}, userSchema)
```

##### delete

Makes a DELETE request to the API.

```typescript
async delete<T = void>(path: string, schema?: z.ZodType<T>): Promise<T>
```

**Parameters**:
- `path` - API endpoint path
- `schema` - Optional Zod schema for response validation

**Returns**: `Promise<T>` - Response data

**Example**:
```typescript
await client.delete('/users/123')
```

##### stream

Creates an async iterator for Server-Sent Events (SSE) streaming.

```typescript
async *stream(path: string, params?: Record<string, string>): AsyncIterable<{ type: string; data: unknown; id?: string }>
```

**Parameters**:
- `path` - API endpoint path
- `params` - Optional query parameters

**Returns**: `AsyncIterable` - SSE events

**Example**:
```typescript
for await (const event of client.stream('/events')) {
  console.log('Event type:', event.type)
  console.log('Event data:', event.data)
}
```

##### putRaw

Makes a PUT request with raw binary data.

```typescript
async putRaw(
  path: string,
  body: Buffer | ReadableStream,
  contentType: string,
  headers: Record<string, string> = {}
): Promise<unknown>
```

**Parameters**:
- `path` - API endpoint path
- `body` - Raw data (Buffer or ReadableStream)
- `contentType` - Content-Type header value
- `headers` - Additional headers to include

**Returns**: `Promise<unknown>` - Response data

**Example**:
```typescript
const fileBuffer = fs.readFileSync('file.pdf')
const result = await client.putRaw('/files/upload', fileBuffer, 'application/pdf')
```

### HttpClient

Low-level HTTP client for making requests to the Frontal API.

#### Constructor

```typescript
constructor(config: ClientConfigOutput)
```

**Parameters**:
- `config` - Validated client configuration

#### Methods

##### get

Makes a GET request to the specified endpoint.

```typescript
async get<T>(path: string, params?: Record<string, unknown>, schema?: z.ZodType<T>): Promise<T>
```

##### post

Makes a POST request to the specified endpoint.

```typescript
async post<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

##### put

Makes a PUT request to the specified endpoint.

```typescript
async put<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

##### patch

Makes a PATCH request to the specified endpoint.

```typescript
async patch<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

##### delete

Makes a DELETE request to the specified endpoint.

```typescript
async delete<T>(path: string, body?: unknown, schema?: z.ZodType<T>): Promise<T>
```

##### putRaw

Makes a PUT request with raw binary data.

```typescript
async putRaw(
  path: string,
  body: Buffer | ReadableStream,
  contentType: string,
  headers: Record<string, string>
): Promise<unknown>
```

##### stream

Creates an async iterator for Server-Sent Events.

```typescript
async *stream(path: string, params?: Record<string, string>): AsyncIterable<{ type: string; data: unknown; id?: string }>
```

## Error Classes

### FrontalError

Base error class for all Frontal API errors.

#### Properties

- `code: string` - Error code returned by the API
- `requestId: string` - Unique identifier for the request
- `statusCode: number` - HTTP status code
- `docs?: string` - Optional URL to documentation

#### Constructor

```typescript
constructor(response: ErrorResponseInput, statusCode: number)
```

### Specific Error Classes

#### NotFoundError

Thrown when a requested resource is not found (HTTP 404).

```typescript
class NotFoundError extends FrontalError
```

#### UnauthorizedError

Thrown when authentication fails (HTTP 401).

```typescript
class UnauthorizedError extends FrontalError
```

#### ForbiddenError

Thrown when the client lacks permission to access a resource (HTTP 403).

```typescript
class ForbiddenError extends FrontalError
```

#### ValidationError

Thrown when request validation fails (HTTP 400).

```typescript
class ValidationError extends FrontalError
```

**Additional Properties**:
- `fields: ErrorField[]` - Array of field-specific validation errors

#### ConflictError

Thrown when a resource conflict occurs (HTTP 409).

```typescript
class ConflictError extends FrontalError
```

#### RateLimitError

Thrown when rate limits are exceeded (HTTP 429).

```typescript
class RateLimitError extends FrontalError
```

**Additional Properties**:
- `retryAfter: number` - Number of seconds to wait before retrying

#### ServiceError

Thrown for server-side errors (5xx status codes).

```typescript
class ServiceError extends FrontalError
```

#### NetworkError

Thrown when network connectivity fails.

```typescript
class NetworkError extends Error
```

**Properties**:
- `cause: unknown` - The underlying cause of the network error

### Error Parsing Function

#### parseFrontalError

Parses an HTTP response body and status code into an appropriate FrontalError.

```typescript
function parseFrontalError(
  body: unknown,
  status: number,
  retryAfter?: string
): FrontalError
```

**Parameters**:
- `body` - Response body from the failed request
- `status` - HTTP status code
- `retryAfter` - Optional Retry-After header value (seconds)

**Returns**: `FrontalError` - Appropriate error instance

## Configuration

### clientConfigSchema

Zod schema for client configuration validation.

```typescript
const clientConfigSchema = z.object({
  apiKey: z.string().regex(/^frt_/, 'apiKey must start with "frt_"').min(5),
  baseUrl: z.url().default('https://api.frontal.dev/v1'),
  timeout: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().positive().default(1000),
  headers: z.record(z.string(), z.string()).default({}),
  environment: z.string().default('production'),
  debug: z.boolean().default(false),
  fetch: z.custom<typeof fetch>().optional(),
  logger: z.object({
    request: z.function().optional(),
    response: z.function().optional(),
    error: z.function().optional(),
  }).optional(),
})
```

### Types

#### ClientConfigInput

Input type for client configuration. Allows partial configuration with defaults applied.

```typescript
type ClientConfigInput = z.input<typeof clientConfigSchema>
```

#### ClientConfigOutput

Output type for client configuration. Represents fully validated configuration.

```typescript
type ClientConfigOutput = z.output<typeof clientConfigSchema>
```

## Types

### APIResponse

Standard API response structure.

```typescript
interface APIResponse<T> {
  data: T | null
  error: ErrorResponse | null
  headers: Record<string, string> | null
}
```

### PageResult

Page result interface for paginated responses.

```typescript
interface PageResult<T> {
  data: T[]
  meta?: ResponseMeta
  pagination: PaginationMeta
  nextPage(): Promise<PageResult<T> | null>
  all(): Promise<T[]>
  [Symbol.asyncIterator](): AsyncIterator<T>
}
```

### QueryBuilder

Query builder interface for paginated queries.

```typescript
interface QueryBuilder<T> {
  where(conditions: FilterConditions): this
  include(...relations: string[]): this
  orderBy(field: string, direction?: 'asc' | 'desc'): this
  limit(n: number): this
  fields(...fields: string[]): this
  at(timestamp: Date | string): this
  execute(): Promise<PageResult<T>>
  first(): Promise<T | null>
  count(): Promise<number>
  exists(): Promise<boolean>
  all(): Promise<T[]>
  [Symbol.asyncIterator](): AsyncIterator<T>
}
```

### ErrorResponse

Standard error response structure.

```typescript
interface ErrorResponse {
  message: string
  statusCode: number
  name: string
}
```

## Schemas

### timestampSchema

Zod schema for timestamp validation.

```typescript
const timestampSchema = z.date().transform((date: Date) => new Date(date))
```

### responseMetaSchema

Zod schema for response metadata.

```typescript
const responseMetaSchema = z.object({
  requestId: z.string(),
  timestamp: timestampSchema,
  version: z.string().optional(),
  substrate: z.string().optional(),
  latency: z.object({
    total: z.number().int(),
    substrate: z.number().int(),
  }).optional(),
})
```

### paginationMetaSchema

Zod schema for pagination metadata.

```typescript
const paginationMetaSchema = z.object({
  cursor: z.string(),
  hasMore: z.boolean(),
  total: z.number().int().optional(),
  limit: z.number().int(),
  offset: z.number().int().optional(),
})
```

### errorFieldSchema

Zod schema for validation error fields.

```typescript
const errorFieldSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
})
```

### errorResponseSchema

Zod schema for API error responses.

```typescript
const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  docs: z.string().url().optional(),
  fields: z.array(errorFieldSchema).optional(),
})
```

### retryConfigSchema

Zod schema for retry configuration.

```typescript
const retryConfigSchema = z.object({
  maxAttempts: z.number().int().min(0).default(3),
  baseDelay: z.number().int().positive().default(1000),
  strategy: z.enum(['exponential', 'linear', 'constant']).default('exponential'),
  on: z.array(z.number().int()).default([429, 500, 502, 503, 504]),
  jitter: z.boolean().default(true),
})
```

### filterValueSchema

Zod schema for query filter values.

```typescript
const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.array(z.string()),
  z.array(z.number()),
  z.null(),
])
```

### filterConditionsSchema

Zod schema for query filter conditions.

```typescript
const filterConditionsSchema = z.record(
  z.union([
    filterValueSchema,
    z.object({
      eq: filterValueSchema.optional(),
      ne: filterValueSchema.optional(),
      gt: filterValueSchema.optional(),
      gte: filterValueSchema.optional(),
      lt: filterValueSchema.optional(),
      lte: filterValueSchema.optional(),
      in: z.array(filterValueSchema).optional(),
      nin: z.array(filterValueSchema).optional(),
      contains: z.string().optional(),
      startsWith: z.string().optional(),
      endsWith: z.string().optional(),
    }),
  ])
)
```

### pageResultSchema

Zod schema for paginated responses.

```typescript
const pageResultSchema = z.object({
  data: z.array(z.unknown()),
  meta: responseMetaSchema.optional(),
  pagination: paginationMetaSchema,
})
```

## Utilities

### Pagination

#### createPageResult

Factory function for creating PageResult objects.

```typescript
function createPageResult<T>(
  data: T[],
  pagination: PaginationMeta,
  fetchNextPage: () => Promise<PageResult<T> | null>,
  meta?: ResponseMeta
): PageResult<T>
```

**Parameters**:
- `data` - Array of items for the current page
- `pagination` - Pagination metadata
- `fetchNextPage` - Function to fetch the next page
- `meta` - Optional response metadata

**Returns**: `PageResult<T>` - Page result object

### Retry

#### calculateDelay

Calculate retry delay with jitter.

```typescript
function calculateDelay(
  attempt: number,
  strategy: 'exponential' | 'linear' | 'constant',
  baseDelay: number,
  jitter: boolean = true
): number
```

**Parameters**:
- `attempt` - Current attempt number (0-based)
- `strategy` - Backoff strategy
- `baseDelay` - Base delay in milliseconds
- `jitter` - Whether to add random jitter

**Returns**: `number` - Delay in milliseconds

### Environment Variables

#### keys

Environment variable management utilities.

```typescript
const keys = {
  client: createEnv({
    schema: {
      FRONTAL_API_KEY: z.string().min(1),
      FRONTAL_ENVIRONMENT: z.string().optional(),
      FRONTAL_DEBUG: z.coerce.boolean().optional(),
    },
    runtimeEnv: process.env,
  })
}
```

**Usage**:
```typescript
const config = keys.client.parse(process.env)
const client = new FrontalClient({
  apiKey: config.FRONTAL_API_KEY,
  environment: config.FRONTAL_ENVIRONMENT ?? 'production',
  debug: config.FRONTAL_DEBUG ?? false,
})
```

## Constants

### DEFAULT_BASE_URL

Default base URL for the Frontal API.

```typescript
const DEFAULT_BASE_URL = 'https://api.frontal.dev/v1'
```

### API_KEY_PREFIX

Required prefix for Frontal API keys.

```typescript
const API_KEY_PREFIX = 'frt_'
```

### BACKOFF_STRATEGIES

Available backoff strategies for retry attempts.

```typescript
const BACKOFF_STRATEGIES = ['exponential', 'linear', 'constant'] as const
```

### DEFAULT_RETRY_ON

Default HTTP status codes that trigger retry attempts.

```typescript
const DEFAULT_RETRY_ON = [429, 500, 502, 503, 504]
```

### EXPONENTIAL_BASE

Base multiplier for exponential backoff calculations.

```typescript
const EXPONENTIAL_BASE = 2
```

### JITTER_MAX

Maximum jitter (in milliseconds) to add to retry delays.

```typescript
const JITTER_MAX = 200
```

## TypeScript Types

### Scalar

Union type for scalar values.

```typescript
type Scalar = string | number | boolean | Date | null
```

### ResponseMeta

Type for response metadata.

```typescript
type ResponseMeta = z.infer<typeof responseMetaSchema>
```

### PaginationMeta

Type for pagination metadata.

```typescript
type PaginationMeta = z.infer<typeof paginationMetaSchema>
```

### ErrorField

Type for validation error fields.

```typescript
type ErrorField = z.infer<typeof errorFieldSchema>
```

### RetryConfig

Type for retry configuration.

```typescript
type RetryConfig = z.infer<typeof retryConfigSchema>
```

### FilterConditions

Type for query filter conditions.

```typescript
type FilterConditions = z.infer<typeof filterConditionsSchema>
```

### FilterValue

Type for query filter values.

```typescript
type FilterValue = z.infer<typeof filterValueSchema>
```
