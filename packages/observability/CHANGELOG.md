# Changelog

## 0.1.2

### Patch Changes

- e88cf11: Add missing API surfaces

  - Add FRONTAL_AGENTS_API_URL env var support to agents client for
    per-service URL overrides
  - Add AuditSdkEventSchema alias to audit schemas
  - Add report() method to ObservabilityEventsNamespace for single
    event reporting

## 0.1.1

### Patch Changes

- Bundle `frontal/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.1.0

### Minor Changes

- ca0a261: Add the observability events surface (`sdk.observability.events`): `report`
  (`POST /v1/observability/events`), `reportBatch` (`/events/batch`), and `stats`
  (`GET /v1/observability/events/stats`), matching the real backend.

### Patch Changes

- Updated dependencies [ca0a261]
  - frontal/core@1.0.2

## 0.0.1
