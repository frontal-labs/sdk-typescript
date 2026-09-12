---
"@frontal-labs/agents": major
---

- `agents.define(name, options)` typed one-shot form with `triggers`, `stateSchema`, `tools` (shared `ToolSet`), `approveWhen`/`approvers`; builder gains `.state()`, `.tools()`, `.approveWhen()`, `.configure()`, `.toJSON()`.
- `create()` now returns the agent resource merged with a typed accessor (`id`, `name`, … plus `message`, `watch`, `waitForCompletion`, `requiresApproval`, `.agent`).
- `use(id, { stateSchema, stateEvent })` re-attaches with typing; `stateEvent` overrides the SSE event name that carries state snapshots (default `"state"`).
- **Breaking:** `watch(runId, { signal })` now yields `AgentRunEvent` parts — `{ type: "event", event, data }`, typed `{ type: "state", state }`, `{ type: "error", error }` (with `retryable`), `abort`, `done` — and no longer throws mid-stream. Code that read `event.type` / `event.data` on every item must switch on `type` first (`if (e.type === "event") …`).
- **Breaking:** `AgentBuilder.create()` returns the resource merged with a typed accessor instead of the bare resource (all resource fields are still present).
- `toApprovalStep()` maps an agent's approval contract to a workflow approval step.
- `create()` accepts `AgentDefinitionInput` (defaulted fields optional) and reports invalid definitions with readable field lists.
- `AgentBuilder.on()` now throws: local handlers were never uploaded or executed.
