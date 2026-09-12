# @frontal-labs/governance

Policies, compliance, roles, permissions and access checks.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.governance`. To install only this
package: `bun add @frontal-labs/governance`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const { allowed } = await f.governance.access.check({
  userId: "usr_1",
  roleNames: ["editor"],
  action: "dataset:read",
});
console.log(allowed);
```

## Usage

### Standalone client

```ts
import { createGovernanceClient } from "@frontal-labs/governance";

const governance = createGovernanceClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createGovernanceClient } from "@frontal-labs/governance";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const governance = createGovernanceClient(client);
```

### Create a policy

```ts
const policy = await f.governance.policies.create({
  name: "pii-readonly",
  description: "PII datasets are read-only for analysts",
  rules: [
    {
      id: "r1",
      resource: "dataset:pii/*",
      actions: ["write", "delete"],
      effect: "deny",
    },
  ],
});
console.log(policy.id);
```

### Run a compliance assessment

```ts
const assessment = await f.governance.compliance.runAssessment({
  framework: "soc2",
});
console.log(assessment);
```

### List roles

```ts
const roles = await f.governance.roles.list({ limit: 20 });
console.log(roles.data);
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
