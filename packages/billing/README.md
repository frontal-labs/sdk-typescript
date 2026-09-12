# @frontal-labs/billing

Customers, plans, subscriptions, invoices, wallets, meters, prices and add-ons.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.billing`. To install only this
package: `bun add @frontal-labs/billing`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const plans = await f.billing.plans.list({ limit: 10 });
console.log(plans.data.map((p) => p.id));
```

## Usage

### Standalone client

```ts
import { createBillingClient } from "@frontal-labs/billing";

const billing = createBillingClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createBillingClient } from "@frontal-labs/billing";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const billing = createBillingClient(client);
```

### Subscription lifecycle

```ts
const sub = await f.billing.subscriptions.get("sub_1");
console.log(sub.status, sub.currentPeriodEnd);
await f.billing.subscriptions.pause("sub_1");
await f.billing.subscriptions.resume("sub_1");
```

### Customer usage and entitlements

```ts
const usage = await f.billing.customers.usage("cus_1");
const entitlements = await f.billing.customers.entitlements("cus_1");
console.log(usage, entitlements);
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
