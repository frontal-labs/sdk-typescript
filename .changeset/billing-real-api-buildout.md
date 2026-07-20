---
"@frontal-labs/billing": major
---

Build out the billing client against the real `billing/backend/platform` API and
fix routing. The billing service serves its resources at the top level
(`/v1/customers`, `/v1/subscriptions`, …); the public gateway now exposes them
under `/v1/billing` and strips the `billing` segment before proxying (previously
`/v1/billing/*` reached the service but matched no route).

The client is reshaped into first-class resource namespaces, each with
`list`/`create`/`get`/`update`/`delete`/`search` plus resource actions:

- `customers` (+ `entitlements`, `usage`, `wallets`, `invoiceSummary`, `portalSession`)
- `plans` (+ `clone`, `entitlements`)
- `subscriptions` (+ `activate`, `cancel`, `pause`, `resume`, `entitlements`) — note
  the path is now plural `/subscriptions` (was the fabricated singular `/subscription`)
- `invoices` (+ `finalize`, `void`, `preview`, `pdf`)
- `wallets` (+ `transactions`, `topUp`, `terminate`, `realTimeBalance`)
- `meters` (+ `disable`), `prices` (+ `lookup`), `addons` (+ `entitlements`)

Removed the fabricated `usage` and `paymentMethods` namespaces.
