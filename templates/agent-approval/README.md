# Agent + approval template

A typed agent (`stateSchema`, `tools`, `approveWhen`) whose approval contract
is mirrored as a workflow approval step, then a run that pauses for a human.

```bash
cp -r templates/agent-approval my-triage && cd my-triage
cp .env.example .env      # FRONTAL_API_KEY=frt_...
bun install && bun start
```

`src/index.ts` exports `run(f)` so the flow is testable against mocks — see
`tests/templates/agent-approval.test.ts` in the SDK repo, which drives it with
`MockFrontal.scenario(...)`.

What to change: the trigger event, the state schema, the `approveWhen`
predicate, and who is in `approvers`.
