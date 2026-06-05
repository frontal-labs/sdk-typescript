# Organization API Reference

Complete API reference for `@frontal-labs/organization`.

## Factory Functions

### `createOrganizationClient()`

```typescript
function createOrganizationClient(client: FrontalClient): OrganizationService;
function createOrganizationClient(config: OrganizationClientConfig): OrganizationService;
```

Creates a new Organization service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`OrganizationService` — A new service instance.

### Default Singleton

```typescript
import { organization } from "@frontal-labs/organization";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## OrganizationService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface OrganizationClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `Permission`
- `Plan`
- `OrganizationStatus`
- `Organization`
- `Tenant`
- `Team`
- `MemberStatus`
- `Member`
- `Role`
- `InvitationStatus`
- `Invitation`
- `MemberSession`
- `OrgConfig`

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
