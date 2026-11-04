# Changelog

## 0.0.7

### Patch Changes

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
  - @frontal-labs/core@1.1.2

## 0.0.6

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 0.0.5

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

## 0.0.4

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.0.3

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
