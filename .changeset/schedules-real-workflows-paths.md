---
"@frontal-labs/schedules": major
---

Align the schedules client with the real backend. Schedules are part of the
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
