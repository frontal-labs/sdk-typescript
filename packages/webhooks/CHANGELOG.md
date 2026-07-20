# Changelog

## 0.0.4

### Patch Changes

- Bundle `frontal/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.0.3

### Patch Changes

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

- Updated dependencies [ca0a261]
  - frontal/core@1.0.2

## 0.0.1
