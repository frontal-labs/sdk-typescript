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

// Resources: customers, plans, subscriptions, invoices, wallets, meters,
// prices, addons — each with list/create/get/update/delete/search + actions.
const customer = await billing.customers.create({ name: "Acme", externalId: "acme" });
const plans = await billing.plans.list();

const sub = await billing.subscriptions.create({
  customerId: customer.id,
  planId: plans.data[0].id,
});
await billing.subscriptions.cancel(sub.id);

const invoices = await billing.invoices.list();
const wallet = await billing.wallets.realTimeBalance("wal_123");
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_BILLING_API_URL` — Custom billing API base URL
