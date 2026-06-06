# @frontal-labs/auth

GoTrue-compatible authentication SDK for user sign-up, sign-in, MFA, OAuth, SSO, and admin operations.

## Installation

```bash
bun add @frontal-labs/auth @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
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

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_AUTH_API_URL` — Custom auth API base URL
