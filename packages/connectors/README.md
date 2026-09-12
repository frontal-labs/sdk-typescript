# @frontal-labs/connectors

Source connectors — discover connector definitions, install them per tenant, and replay or diagnose sync runs.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.connectors`. To install only this
package: `bun add @frontal-labs/connectors`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const definitions = await f.connectors.list();
console.log(definitions.map((d) => d.slug));
```

## Usage

### Standalone client

```ts
import { createConnectorsClient } from "@frontal-labs/connectors";

const connectors = createConnectorsClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createConnectorsClient } from "@frontal-labs/connectors";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const connectors = createConnectorsClient(client);
```

### Install a connector for a tenant

```ts
const installation = await f.connectors.installations.create({
  connectorSlug: "postgres",
  tenantId: "tn_acme",
  datasetNamespace: "acme.crm",
  displayName: "Acme CRM",
  auth: { mode: "connection_string", secretRef: "secret://acme/pg" },
});
console.log(installation.id);
```

### List installations

```ts
const page = await f.connectors.installations.list({ tenantId: "tn_acme" });
for (const inst of page.data) console.log(inst.id, inst.connectorSlug);
```

### Diagnostics

```ts
const diag = await f.connectors.diagnostics();
console.log(diag);
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
