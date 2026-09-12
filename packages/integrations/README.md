# @frontal-labs/integrations

Third-party integrations — install providers with scoped credentials, run and replay actions, test connections and simulate policy.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.integrations`. To install only this
package: `bun add @frontal-labs/integrations`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const providers = await f.integrations.providers.list();
console.log(providers.map((p) => p.slug));
```

## Usage

### Standalone client

```ts
import { createIntegrationsClient } from "@frontal-labs/integrations";

const integrations = createIntegrationsClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createIntegrationsClient } from "@frontal-labs/integrations";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const integrations = createIntegrationsClient(client);
```

### Create an integration

```ts
const integration = await f.integrations.create({
  provider: "slack",
  tenantId: "tn_acme",
  displayName: "Acme Slack",
  config: { defaultChannel: "#alerts" },
  auth: { scheme: "bearer", secretRef: "secret://acme/slack" },
});
console.log(integration.id);
```

### Test a connection

```ts
const result = await f.integrations.test("int_123");
console.log(result);
```

### Simulate policy scopes

```ts
const sim = await f.integrations.policy.simulate(
  ["chat:write", "channels:read"],
  ["chat:write"]
);
console.log(sim);
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
