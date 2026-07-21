# Audit API Reference

Complete API reference for `@frontal-labs/audit`.

## Factory Functions

### `createAuditClient()`

```typescript
function createAuditClient(client: FrontalClient): AuditService;
function createAuditClient(config: AuditClientConfig): AuditService;
```

Creates a new Audit service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`AuditService` — A new service instance.

### Default Singleton

```typescript
import { audit } from "@frontal-labs/audit";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## AuditService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface AuditClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `AuditEvent`
- `AuditEventInput`
- `AuditQuery`
- `AuditReport`
- `AuditConfig`

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
