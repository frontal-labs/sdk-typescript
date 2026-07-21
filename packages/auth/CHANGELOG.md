# Changelog

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Align the auth client with the real `iam/backend/auth-server` routes and build
  out the account + admin surfaces.

  - **Path fixes** (previously mis-routed): - Admin operations now use `/auth/admin/*` (were `/admin/*`, which the gateway
    would not route under its `/v1/auth` prefix). - Session APIs use `/auth/auth/session` (the gateway maps `/v1/auth/auth/*` →
    the service's `/api/auth/*`); was `/auth/session`. - MFA maps to the real factors API: `enroll` → `POST /auth/factors`, `challenge`
    /`verify` → `/auth/factors/{id}/{challenge|verify}`, `unenroll` → `DELETE
/auth/factors/{id}`, `listFactors` → `GET /auth/factors` (were `/auth/mfa/*`).
  - **New `account` namespace** (`/auth/account/*`, gateway-mapped to `/api/account/*`):
    `getProfile`/`updateProfile`/`deleteProfile`, `updatePassword`, `getAuditLog`,
    plus `account.apiKeys`, `account.devices`, `account.sessions`, and `account.mfa`
    sub-namespaces.

  Public sign-in/sign-up/verify/recover/OTP/SSO/user/identity methods are unchanged.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
