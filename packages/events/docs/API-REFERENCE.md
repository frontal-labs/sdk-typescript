# Events API Reference

Complete API reference for `@frontal-labs/events`.

## Factory Functions

### `createEventsClient()`

```typescript
function createEventsClient(client: FrontalClient): EventsService;
function createEventsClient(config: EventsClientConfig): EventsService;
```

Creates a new Events service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`EventsService` — A new service instance.

### Default Singleton

```typescript
import { events } from "@frontal-labs/events";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## EventsService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface EventsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `Event`
- `PublishEvent`
- `Topic`
- `Subscription`
- `DeadLetterEvent`
- `EventType`
- `EventsConfig`

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
