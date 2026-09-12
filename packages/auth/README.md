# @frontal-labs/auth

Authentication — sign up/in, MFA, account self-service, and an admin surface for user management.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.auth`. To install only this
package: `bun add @frontal-labs/auth`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const session = await f.auth.signInWithPassword({
  email: "ada@example.com",
  password: process.env.DEMO_PASSWORD!,
});
console.log(session);
```

## Usage

### Standalone client

```ts
import { createAuthClient } from "@frontal-labs/auth";

const auth = createAuthClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createAuthClient } from "@frontal-labs/auth";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const auth = createAuthClient(client);
```

### Admin: invite a user

```ts
const invited = await f.auth.admin.inviteUserByEmail("grace@example.com");
console.log(invited);
```

### Account self-service

```ts
const profile = await f.auth.account.getProfile();
console.log(profile);
```
## Error handling

All failures throw a typed `FrontalError` subclass (`NotFoundError`,
`ValidationError`, `RateLimitError`, ...) carrying `code`, `requestId` and
`statusCode`. See [`@frontal-labs/core`](../core/README.md#error-handling).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API key (`frt_...`) |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
