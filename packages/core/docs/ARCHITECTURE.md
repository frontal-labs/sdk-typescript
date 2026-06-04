# @frontal-labs/core Architecture

## Package Structure

The `@frontal-labs/core` package follows a modular architecture with clear separation of concerns:

```
packages/core/src/
├── client.ts      # Main FrontalClient class
├── config.ts      # Configuration schemas and types
├── http.ts        # Low-level HTTP client
├── errors.ts      # Error classes and handling
├── schemas.ts     # Zod schemas for API responses
├── types.ts       # TypeScript interfaces and types
├── pagination.ts  # Pagination utilities
├── retry.ts       # Retry logic and strategies
├── constants.ts   # Package constants
├── keys.ts        # Environment variable management
└── index.ts       # Public API exports
```

## Core Architecture Principles

### 1. Layered Design

The package follows a layered architecture pattern:

```
FrontalClient (High-level API)
    ↓
HttpClient (HTTP transport layer)
    ↓
Fetch API (Network layer)
```

- **FrontalClient**: Provides a simple, high-level interface for common operations
- **HttpClient**: Handles HTTP-specific concerns (headers, retries, error mapping)
- **Fetch API**: Standard web API for network requests

### 2. Configuration-First Design

All configuration is validated at runtime using Zod schemas:

```typescript
// Configuration flow
ClientConfigInput → Zod Validation → ClientConfigOutput
```

This ensures:
- Type safety
- Runtime validation
- Default value application
- Clear error messages for invalid configuration

### 3. Error-Driven Development

Comprehensive error handling with specific error classes:

```typescript
// Error hierarchy
FrontalError (base)
├── NotFoundError (404)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── ValidationError (400)
├── ConflictError (409)
├── RateLimitError (429)
├── ServiceError (5xx)
└── NetworkError (network issues)
```

### 4. Schema-Based Type Safety

All API interactions use Zod schemas for:
- Request validation
- Response parsing
- Type inference
- Runtime safety

## Module Responsibilities

### client.ts - FrontalClient

**Purpose**: High-level SDK interface

**Responsibilities**:
- Provide simple methods for HTTP operations (GET, POST, PUT, PATCH, DELETE)
- Handle response schema validation
- Expose streaming capabilities
- Manage raw binary data uploads

**Key Methods**:
- `get<T>(path, schema?)` - GET requests
- `post<T>(path, body?, schema?)` - POST requests
- `put<T>(path, body?, schema?)` - PUT requests
- `patch<T>(path, body?, schema?)` - PATCH requests
- `delete<T>(path, schema?)` - DELETE requests
- `stream(path, params?)` - SSE streaming
- `putRaw(path, body, contentType, headers?)` - Binary uploads

### http.ts - HttpClient

**Purpose**: Low-level HTTP transport

**Responsibilities**:
- Build HTTP requests with proper headers
- Handle authentication (API key)
- Implement retry logic with exponential backoff
- Parse responses and handle errors
- Manage timeouts and network errors

**Key Features**:
- Automatic retry for transient failures
- Request/response logging (when debug enabled)
- Custom fetch implementation support
- Proper error mapping to specific error classes

### config.ts - Configuration Management

**Purpose**: Type-safe configuration handling

**Responsibilities**:
- Define Zod schemas for configuration validation
- Provide TypeScript types for configuration
- Apply default values
- Validate API key format and other constraints

**Schema Structure**:
```typescript
clientConfigSchema = {
  apiKey: string (required, starts with 'frt_')
  baseUrl: url (default: 'https://api.frontal.dev/v1')
  timeout: number (default: 30000)
  maxRetries: number (default: 3, range: 0-10)
  retryDelay: number (default: 1000)
  headers: Record<string, string> (default: {})
  environment: string (default: 'production')
  debug: boolean (default: false)
  fetch?: typeof fetch
  logger?: Logger
}
```

### errors.ts - Error Handling

**Purpose**: Comprehensive error management

**Responsibilities**:
- Define error classes for different HTTP status codes
- Provide structured error information
- Map HTTP responses to appropriate error types
- Support for field-specific validation errors

**Error Features**:
- Request ID tracking
- Error codes and messages
- Documentation links
- Retry information for rate limits
- Field validation details

### schemas.ts - Schema Definitions

**Purpose**: Zod schemas for API data structures

**Key Schemas**:
- `timestampSchema` - Date handling
- `responseMetaSchema` - Response metadata
- `paginationMetaSchema` - Pagination information
- `errorFieldSchema` - Validation error fields
- `errorResponseSchema` - API error responses
- `retryConfigSchema` - Retry configuration
- `filterValueSchema` - Query filter values
- `filterConditionsSchema` - Query filter conditions

### types.ts - TypeScript Types

**Purpose**: Core type definitions

**Key Types**:
- `APIResponse<T>` - Standard API response structure
- `PageResult<T>` - Paginated response interface
- `QueryBuilder<T>` - Query builder interface
- `ErrorResponse` - Error response structure

### pagination.ts - Pagination Utilities

**Purpose**: Handle paginated API responses

**Features**:
- `pageResultSchema` - Zod schema for paginated responses
- `createPageResult()` - Factory function for PageResult objects
- Async iteration support
- Automatic next page fetching
- Efficient data aggregation

### retry.ts - Retry Logic

**Purpose**: Implement retry strategies

**Features**:
- `calculateDelay()` - Calculate retry delays with jitter
- Exponential backoff support
- Configurable retry strategies
- Jitter to prevent thundering herd

### constants.ts - Package Constants

**Purpose**: Define package-wide constants

**Constants**:
- `DEFAULT_BASE_URL` - Default API endpoint
- `API_KEY_PREFIX` - Required API key prefix
- `BACKOFF_STRATEGIES` - Available retry strategies
- `DEFAULT_RETRY_ON` - Status codes that trigger retries
- `EXPONENTIAL_BASE` - Base for exponential backoff
- `JITTER_MAX` - Maximum jitter in milliseconds

### keys.ts - Environment Variables

**Purpose**: Secure environment variable handling

**Features**:
- Environment variable schema definitions
- Type-safe environment parsing
- Validation of required environment variables
- Integration with `@t3-oss/env-core`

## Data Flow

### Request Flow

```
1. FrontalClient.method()
   ↓
2. HttpClient.request()
   ↓
3. Build request with headers/auth
   ↓
4. Apply retry logic (if needed)
   ↓
5. Execute fetch()
   ↓
6. Parse response
   ↓
7. Validate with schema (if provided)
   ↓
8. Return typed data or throw error
```

### Error Flow

```
1. HTTP error response
   ↓
2. parseFrontalError()
   ↓
3. Map status code to error class
   ↓
4. Create specific error instance
   ↓
5. Include request ID and context
   ↓
6. Throw error to caller
```

### Pagination Flow

```
1. Initial request with pageResultSchema
   ↓
2. Create PageResult object
   ↓
3. Access data via .data property
   ↓
4. Call .nextPage() for more data
   ↓
5. Automatic iteration via async iterator
   ↓
6. Call .all() for complete dataset
```

## Design Patterns

### 1. Builder Pattern

Used in `QueryBuilder<T>` for complex queries:

```typescript
client.query('/users')
  .where({ active: true })
  .orderBy('createdAt', 'desc')
  .limit(10)
  .execute()
```

### 2. Factory Pattern

Used for creating PageResult objects:

```typescript
const pageResult = createPageResult(data, pagination, fetchNextPage)
```

### 3. Strategy Pattern

Used for retry strategies:

```typescript
const delay = calculateDelay(attempt, 'exponential', baseDelay)
```

### 4. Template Method Pattern

Used in HttpClient for consistent request handling:

```typescript
async request(method, path, body, params, schema) {
  // Standard request flow
  // 1. Build request
  // 2. Execute with retry
  // 3. Parse response
  // 4. Validate schema
  // 5. Return result
}
```

## Extensibility

The architecture supports extension through:

1. **Custom Fetch Implementation**: Pass custom fetch to configuration
2. **Custom Logger**: Implement logging interface
3. **Additional Schemas**: Extend with domain-specific schemas
4. **Error Handling**: Create custom error classes
5. **Retry Strategies**: Add new backoff strategies

## Performance Considerations

### 1. Lazy Loading

Schemas and types are only loaded when used, reducing bundle size.

### 2. Efficient Pagination

PageResult objects fetch data on-demand rather than all at once.

### 3. Connection Reuse

HttpClient can be configured to reuse connections via custom fetch.

### 4. Minimal Overhead

Type validation only occurs when schemas are provided.

## Security Considerations

### 1. API Key Validation

API keys are validated for format and required prefix.

### 2. Environment Variable Handling

Sensitive configuration is handled through environment variables.

### 3. Request Headers

Security headers are automatically added to all requests.

### 4. Error Information

Error responses don't expose sensitive internal information.

## Testing Strategy

The architecture supports comprehensive testing:

1. **Unit Tests**: Individual module testing
2. **Integration Tests**: HTTP client testing
3. **Schema Tests**: Zod schema validation
4. **Error Tests**: Error handling verification
5. **Pagination Tests**: Pagination flow testing

This architecture provides a solid foundation for the Frontal Core while maintaining flexibility for future enhancements and package-specific extensions.
