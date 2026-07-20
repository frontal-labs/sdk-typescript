# Changelog

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/_core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Align the schedules client with the real backend. Schedules are part of the
  Workflows domain (`workflows/backend/schedule`) and are served under
  `/v1/workflows/schedules` with cron helpers at `/v1/workflows/cron/*` — not
  `/v1/schedules`.

  - CRUD/pause/resume/trigger now target `/workflows/schedules[/{id}[/…]]`; `update`
    uses `PATCH` (was `PUT`).
  - `cron.validate` → `/workflows/cron/validate`; `cron.nextRuns` is replaced by
    `cron.parse` → `/workflows/cron/parse`.
  - Removed the fabricated per-schedule `runs` namespace (`/schedules/{id}/runs*`
    had no backing endpoint).

  The public gateway now routes `/v1/workflows/schedules` and `/v1/workflows/cron`
  to the schedule service (registered ahead of the generic `/v1/workflows` upstream).

### Patch Changes

- ca0a261: Fix request paths to match the real backend services.

  - **connectors**: catalog operations now call `/v1/connectors/catalog` and
    `/v1/connectors/catalog/{slug}` (were `/connectors` / `/connectors/{slug}`),
    and replay calls `/v1/connectors/sync-runs/{id}/replay`.
  - **billing** & **schedules**: removed the hardcoded `/v1/` prefix from routes so
    they no longer produce a doubled `/v1/v1/` path against the versioned base URL.

- Updated dependencies [ca0a261]
  - @frontal-labs/_core@1.0.2

## 0.0.1
