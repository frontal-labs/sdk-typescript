# @frontal-labs/billing

Billing SDK for plans, subscriptions, invoices, usage metering, and payment methods.

## Installation

```bash
bun add @frontal-labs/billing @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createBillingClient } from "@frontal-labs/billing";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const billing = createBillingClient(client);

const plans = await billing.plans.list();
const sub = await billing.subscriptions.get();

await billing.usage.report([
  { metric: "api_calls", quantity: 15000 },
]);

const invoices = await billing.invoices.list();
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_BILLING_API_URL` — Custom billing API base URL
