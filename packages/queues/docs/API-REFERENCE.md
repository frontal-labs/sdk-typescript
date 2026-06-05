# Queues API Reference

Complete API reference for `@frontal-labs/queues`.

## Factory Functions

### `createQueuesClient()`

```typescript
function createQueuesClient(client: FrontalClient): QueuesService;
function createQueuesClient(config: QueuesClientConfig): QueuesService;
```

Creates a new Queues service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`QueuesService` — A new service instance.

### Default Singleton

```typescript
import { queues } from "@frontal-labs/queues";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## QueuesService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface QueuesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `Queue`
- `Job`
- `QueuesConfig`

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
