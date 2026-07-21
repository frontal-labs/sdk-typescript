# Changelog

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
