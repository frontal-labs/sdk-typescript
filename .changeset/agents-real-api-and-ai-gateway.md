---
"@frontal-labs/agents": major
"@frontal-labs/ai": minor
---

Align the agents and ai clients with the real backend.

- **agents**: the client previously routed every operation to the Workflows API
  (`/workflows`, `/workflows/batch`) — the wrong service. It now targets the real
  Agents API (`/v1/agents/*`): `list`/`create` on `/agents`, accessor
  `get`/`update`/`delete`/`rollback`/`versions` on `/agents/{id}`, runs on
  `/agents/{id}/runs` and `/agents/runs/{id}` (`run`, `conversation`, SSE
  `watch` via `/agents/runs/{id}/stream`), plus `health()`. Removed the
  fabricated `deploy`, `pause`, `resume`, `simulate`, `escalations`, and
  `experiments` surfaces that had no backing endpoint. `message()` now returns
  the created run.
- **ai**: added the previously-missing gateway endpoints — `getDefaultModels()`
  (`/internal/models/defaults`), `rerank()` (`/internal/rerank`), and `health()`
  (`/health`).
