# @frontal-labs/audit

Append-only audit events — log who did what to which resource, and query the trail.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.audit`. To install only this
package: `bun add @frontal-labs/audit`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

await f.audit.log({
  action: "dataset.export",
  resource: { type: "dataset", id: "ds_orders" },
  metadata: { format: "csv" },
});
```

## Usage

### Standalone client

```ts
import { createAuditClient } from "@frontal-labs/audit";

const audit = createAuditClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createAuditClient } from "@frontal-labs/audit";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const audit = createAuditClient(client);
```

### Query the trail

```ts
const page = await f.audit.events.list({
  action: "dataset.export",
  resourceType: "dataset",
});
for (const e of page.data) console.log(e.id, e.action);
```

### Batch logging

```ts
await f.audit.events.createBatch([
  { action: "user.login", resource: { type: "user", id: "usr_1" } },
  { action: "user.logout", resource: { type: "user", id: "usr_1" } },
]);
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
