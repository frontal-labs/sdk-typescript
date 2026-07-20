# Observability API Reference

Complete API reference for `@frontal-labs/observability`.

## Factory Functions

### `createObservabilityClient()`

```typescript
function createObservabilityClient(client: FrontalClient): ObservabilityService;
function createObservabilityClient(config: ObservabilityClientConfig): ObservabilityService;
```

Creates a new Observability service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`ObservabilityService` — A new service instance.

### Default Singleton

```typescript
import { observability } from "@frontal-labs/observability";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## ObservabilityService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface ObservabilityClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `LogLevel`
- `LogEntry`
- `LogQuery`
- `MetricPoint`
- `MetricSeries`
- `Trace`
- `TraceSpan`
- `AlertSeverity`
- `AlertRule`
- `IncidentStatus`
- `Incident`
- `WidgetType`
- `Dashboard`
- `ObsConfig`

## Error Types

All methods throw typed errors from `frontal/core`:

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
