# Changelog

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/_core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Align the events client with the real events gateway (`/v1/events/*`). The
  published spec exposes a different (analytics) events API; the SDK now targets
  the real service routes:

  - `publish()` posts to `/events/publish` (topic in the body), not
    `/events/topics/{topic}/publish`.
  - `subscribe()` and `subscriptions.create()` post to `/events/subscriptions`
    (topic in the body), not `/events/topics/{topic}/subscribe`.
  - `schemas.validate()` posts to `/events/schemas/validate` (schema id in the
    body), not `/events/schemas/{id}/validate`.
  - Removed the fabricated `deadLetter` namespace (`/events/dead-letter*` does not
    exist) and added the real resource namespaces: `replays`, `consumers`,
    `consumerGroups`, `routes`, `buses`, `archives`, `retentionPolicies`, and
    `policies`. Failed-event recovery now lives under `events.replays`.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/_core@1.0.2

## 0.0.1
