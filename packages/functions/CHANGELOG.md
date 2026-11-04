# Changelog

## 0.0.3

### Patch Changes

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
  - @frontal-labs/core@1.1.2

All notable changes to this project will be documented in this file.

## 0.0.2

### Patch Changes

- Republish under a new version: `0.0.1` was unpublished from npm and cannot be reused.

## 0.0.1

### Initial Release

- Initial implementation of the Functions SDK
- Basic CRUD operations for functions
- Function invocation (sync and async)
- Versioning and deployment support
- Integration with Frontal unified client