# Auth Examples

This directory contains examples demonstrating how to use the Frontal Auth SDK (GoTrue-compatible).

## Available Examples

### sign-up-and-in.ts
Sign-up, sign-in with password, session refresh, and sign-out.

**Run**: `bun run sign-up-and-in.ts`

### mfa-and-oauth.ts
MFA enrollment (TOTP) and challenge flow, OAuth provider sign-in, SSO.

**Run**: `bun run mfa-and-oauth.ts`

### admin-operations.ts
Admin user CRUD, invite, and magic link generation (service_role key).

**Run**: `bun run admin-operations.ts`

## Getting Started

```env
FRONTAL_API_KEY=your_api_key_here
FRONTAL_SERVICE_ROLE_KEY=your_service_role_key_here
```

```bash
bun run <example-file>.ts
```
