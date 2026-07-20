# Webhooks API Reference

Complete API reference for `@frontal-labs/webhooks`.

## Factory Functions

### `createWebhooksClient()`

```typescript
function createWebhooksClient(client: FrontalClient): WebhooksService;
function createWebhooksClient(config: WebhooksClientConfig): WebhooksService;
```

Creates a new Webhooks service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`WebhooksService` — A new service instance.

### Default Singleton

```typescript
import { webhooks } from "@frontal-labs/webhooks";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## WebhooksService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface WebhooksClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `Webhook`
- `DeliveryAttempt`
- `WebhookStats`
- `WebhooksConfig`

## Error Types

All methods throw typed errors from `@frontal-labs/_core`:

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
