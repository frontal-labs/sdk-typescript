# Changelog

## 1.0.3

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 1.0.2

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

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Redesign the sandbox client to match the real backend. The Frontal sandbox is a
  **compile-and-judge** engine, not a VM/file manager. The fabricated
  `sandboxes`/`templates`/`files`/`executions` surface (create/start/stop/snapshot/
  files) is removed and replaced with the real API:

  - `languages()` → `GET /v1/sandbox/languages`
  - `selfTest({ language, code, stdin?, tier?, resources? })` → `POST /v1/sandbox/self-test`
    → `{ compile, summary }`
  - `submit({ language, code, judge?, task/cases, resourceLimits?, tier? })`
    → `POST /v1/sandbox/submit` → `{ compile, cases[], summary }`

  (The sandbox service serves at its root; the gateway strips the public
  `/v1/sandbox` prefix before proxying.)

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
