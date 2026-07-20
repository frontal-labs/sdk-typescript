# @frontal-labs/auth

GoTrue-compatible authentication SDK for user sign-up, sign-in, MFA, OAuth, SSO, and admin operations.

## Installation

```bash
bun add @frontal-labs/auth @frontal-labs/_core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/_core";
import { createAuthClient } from "@frontal-labs/auth";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const auth = createAuthClient(client);

const result = await auth.signInWithPassword({
  email: "dev@example.com",
  password: "secure-password",
});

const user = await auth.getUser();
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
