# Vectors API Reference

Complete API reference for `@frontal-labs/vectors`.

## Factory Functions

### `createVectorsClient()`

```typescript
function createVectorsClient(client: FrontalClient): VectorsService;
function createVectorsClient(config: VectorsClientConfig): VectorsService;
```

Creates a new Vectors service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`VectorsService` — A new service instance.

### Default Singleton

```typescript
import { vectors } from "@frontal-labs/vectors";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## VectorsService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface VectorsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `VectorIndex`
- `Vector`
- `VectorSearchResult`
- `VectorsConfig`

## Error Types

All methods throw typed errors from `@frontal-labs/core`:

- `FrontalError` — Base error class
- `NotFoundError` — Resource not found (404)
- `UnauthorizedError` — Invalid credentials (401)
- `ForbiddenError` — Insufficient permissions (403)
- `ValidationError` — Invalid request data (400)
- `ConflictError` — Resource conflict (409)
- `RateLimitError` — Rate limit exceeded (429)
- `ServiceError` — Server error (5xx)
- `NetworkError` — Connection failure
- `TimeoutError` — Request timeout
