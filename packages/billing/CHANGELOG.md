# Changelog

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Build out the billing client against the real `billing/backend/platform` API and
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

### Patch Changes

- ca0a261: Fix request paths to match the real backend services.

  - **connectors**: catalog operations now call `/v1/connectors/catalog` and
    `/v1/connectors/catalog/{slug}` (were `/connectors` / `/connectors/{slug}`),
    and replay calls `/v1/connectors/sync-runs/{id}/replay`.
  - **billing** & **schedules**: removed the hardcoded `/v1/` prefix from routes so
    they no longer produce a doubled `/v1/v1/` path against the versioned base URL.

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
