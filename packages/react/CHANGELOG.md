# @frontal-labs/react

## 0.3.0

### Minor Changes

- 75fd069: Error helpers for UI code, and docs for the error model.
  
  - `getPublicMessage(error, fallback?)` in `@frontal-labs/react` returns the server's `public` message, or a fallback. It never returns the developer `message`.
  - `@frontal-labs/sdk` re-exports `describeSdkError`, the `SdkErrorDiagnostics` type and `CircuitBreakerOpenError`.
  - New `docs/ERRORS.md` covers the error hierarchy, the rules for branching and logging, and the recipes for server mapping and tests.
  - The error-taxonomy section of `SKILL.md` and `skills/frontal-sdk/SKILL.md` now describes the base class, the guards, and what is safe to log or show.
  - The `frontal-error` skill is installed under `skills/frontal-error` and linked from `.agents/skills`.

### Patch Changes

- Updated dependencies [8b754dd]
- Updated dependencies [b635776]
- Updated dependencies [dbb006f]
- Updated dependencies [65ab31f]
- Updated dependencies [9d7ab5e]
- Updated dependencies [84bb9b7]
  - @frontal-labs/core@1.2.0
  - @frontal-labs/ai@0.4.0
  - @frontal-labs/workflows@1.0.2

## 0.2.1

### Patch Changes

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
- Updated dependencies [b0c6766]
  - @frontal-labs/core@1.1.2
  - @frontal-labs/agents@2.0.1
  - @frontal-labs/ai@0.3.0
  - @frontal-labs/workflows@1.0.1

## 0.2.0

### Minor Changes

- e4a35e6: New package: `useChat` (streams from any route returning `toUIMessageStreamResponse`, errors as data with `retry()`), `useAgentRun` (trigger + typed run stream), `useWorkflowApprovals` (list/approve/reject). Transport-agnostic; `react >= 18` peer.

### Patch Changes

- Updated dependencies [b1c3216]
- Updated dependencies [d7c7a05]
- Updated dependencies [5fd277e]
- Updated dependencies [6bb6903]
- Updated dependencies [6bb6903]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [af9e479]
- Updated dependencies [f50d2da]
  - @frontal-labs/ai@0.2.0
  - @frontal-labs/agents@2.0.0
  - @frontal-labs/core@1.1.0
  - @frontal-labs/workflows@1.0.0

## 0.1.0

### Added

- Initial release: React hooks for the Frontal SDK (`useChat` over
  `ai.streamText`, `useAgentRun` over agent run streams, `useWorkflowApprovals`
  over workflow approvals).

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-

### Changed

-

### Deprecated

-

### Removed

-

### Fixed

-

### Security

-

## [Version] - YYYY-MM-DD

### Added

-

### Changed

-

### Deprecated

-

### Removed

-

### Fixed

-

### Security

-
