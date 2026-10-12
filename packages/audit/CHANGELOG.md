# Changelog

## 1.0.0

### Major Changes

- 4b90ce4: Align the audit SDK with the real `/v1/audit/events` service (closes the audit item of the SDK alignment plan).
  
  **Breaking — event shape.** Inputs, filters and stored events now use the backend's fields instead of the previously fabricated ones:
  
  | Before | After |
  | --- | --- |
  | `resource: { type, id }` | `resourceType`, `resourceId` |
  | `status` | `outcome` (`"success" \| "failure" \| "denied"`, default `"success"`) |
  | `actor: { userId }` (read) / `actorUserId` (filter) | `actorId` (+ optional `actorType`) |
  | `timeFrom` / `timeTo` | `from` / `to` |
  | `timestamp` | `createdAt` |
  | — | `eventDomain`, `eventType`, `runId`, `sequence`, `requestId`, `idempotencyKey`, `tenantId`, `ipAddress`, `userAgent` |
  
  - Inputs and filters are validated with Zod before the request (`AuditEventInputSchema`, `AuditEventFiltersSchema`); `pageSize`/`offset` filters are exposed.
  - Removed the leftover `AuditReportSchema` / `AuditQuerySchema` types — the service has no reports; compliance lives in `@frontal-labs/governance`.
  - Routes were already the real ones (`POST/GET /audit/events`, `POST /audit/events/batch`, `GET /audit/events/:id`); no change there.

### Patch Changes

- e4a35e6: Input option types now derive from `z.input`, so schema-defaulted fields (e.g. `AuditEventInput.status`, `SemanticSearchOptions.threshold`) are optional for callers as intended.
- Updated dependencies [d7c7a05]
- Updated dependencies [e4a35e6]
- Updated dependencies [f50d2da]
  - @frontal-labs/core@1.1.0

## 0.0.7

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 0.0.6

### Patch Changes

- Publish `@frontal-labs/core` as a shared, public dependency instead of bundling
  it into each package. Previously core's runtime was bundled but its type
  declarations still imported `@frontal-labs/core`, which was unpublished — so
  consumers hit `Cannot find module '@frontal-labs/core'`. Core is now a normal
  dependency of every package, so both runtime and types resolve under any
  package manager (npm/pnpm/yarn/bun) and runtime, and the `@frontal-labs/sdk`
  umbrella shares one `FrontalClient` type across sub-packages.
- Updated dependencies
  - @frontal-labs/core@1.0.3

## 0.0.5

### Patch Changes

- e88cf11: Add missing API surfaces

  - Add FRONTAL_AGENTS_API_URL env var support to agents client for
    per-service URL overrides
  - Add AuditSdkEventSchema alias to audit schemas
  - Add report() method to ObservabilityEventsNamespace for single
    event reporting

## 0.0.4

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.0.3

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
