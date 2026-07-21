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

- ca0a261: Fix routing so requests reach the real backend.

  - **core**: `HttpClient.buildUrl` now normalizes an accidental double `/v1/v1/`
    prefix (base URL already ends in `/v1`) instead of only warning in debug mode.
    This class of 404s is now impossible regardless of how a package writes its
    paths. `route()` collapses the same duplication.
  - **blob**: remapped from the non-existent `/storage/lake/lake/tables/*` paths to
    the real Blob object-store API (`/v1/blob/object/{bucket}/{key}`,
    `/v1/blob/object/{list,sign,copy,move,info}`). Uploads now send multipart form
    data; copy/move send the backend's `{ bucketId, sourceKey, destinationBucket,
destinationKey }` body; `getSignedUrl` returns the `signedURL` from the response.
    Object CRUD/list/sign/copy/move/metadata previously always 404'd.
  - **webhooks**: removed the `/v1/v1/webhooks/...` double-prefix from `get`,
    `update`, `delete`, `rotateSecret`, and delivery routes; paths now resolve to
    the real `/v1/webhooks/*` service.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/core@1.0.1

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
