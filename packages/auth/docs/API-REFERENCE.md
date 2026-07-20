# Auth API Reference

Complete API reference for `@frontal-labs/auth`.

## Factory Functions

### `createAuthClient()`

```typescript
function createAuthClient(client: FrontalClient): AuthService;
function createAuthClient(config: AuthClientConfig): AuthService;
```

Creates a new Auth service instance. Accepts either a shared `FrontalClient` (recommended) or a standalone configuration object.

#### Parameters

| Parameter | Type | Description |
|---|---|---|---|
| `client` | `FrontalClient` | Existing FrontalClient instance (shares HTTP config) |
| `config.apiKey` | `string` | Frontal API key (required for standalone) |
| `config.baseUrl` | `string?` | Custom API base URL |
| `config.timeout` | `number?` | Request timeout in ms (default: 30000) |
| `config.maxRetries` | `number?` | Max retry attempts (default: 3) |

#### Returns

`AuthService` — A new service instance.

### Default Singleton

```typescript
import { auth } from "@frontal-labs/auth";
```

Pre-configured singleton using environment variables. Requires `FRONTAL_API_KEY` to be set.

## AuthService

The main service class. All methods throw typed `FrontalError` subclasses on failure.

### Configuration

```typescript
interface AuthClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
```

## Types

- `User`
- `Session`
- `UserIdentity`
- `Factor`
- `AuthChangeEvent`
- `Provider`
- `SignUpWithPasswordCredentials`
- `SignInWithPasswordCredentials`
- `SignInWithOtpCredentials`
- `SignInWithOAuthCredentials`
- `SignInWithIdTokenCredentials`
- `SignInWithSSOParams`
- `SignInAnonymouslyCredentials`
- `VerifyOtpParams`
- `UserAttributes`
- `AdminUserAttributes`
- `MfaEnrollParams`
- `MfaChallengeParams`
- `MfaVerifyParams`
- `MfaChallengeAndVerifyParams`
- `MfaUnenrollParams`
- `PageParams`
- `Pagination`
- `GenerateLinkParams`
- `EmailOtpType`
- `MobileOtpType`
- `AuthConfig`
- `AuthResponse`
- `AuthTokenResponse`
- `AuthOtpResponse`
- `UserResponse`
- `OAuthResponse`
- `SSOResponse`
- `GenerateLinkResponse`

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
