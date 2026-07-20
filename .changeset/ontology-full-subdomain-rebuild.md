---
"@frontal-labs/ontology": major
---

Rebuild the ontology client against the real Ontology platform API. Previously
nearly every method routed to a single generic `/ontology/engine/runs` endpoint
(a catch-all stub, ~6% real coverage).

The client now exposes one namespace per real subdomain service, each with the
shared `capabilities`/`health`/`info`/`runs` envelope plus its resources:

- `engine` — `generate`, `validate`, `export`, `exportShacl`, `inferClasses`,
  `inferProperties`, `compareVersions`
- `objects` — object-type and object read/put/delete + listing
- `relationships` — relationship-type and relationship read/put/delete
- `schemas` — schema CRUD + `validate`
- `versions` — versions, `compare`, release bundles, `audit/verify`
- `validation` — validation rules + `validatePayload`
- `transformations` — `create`
- `reasoning` — `explain`, `facts`, `reasonForward`/`reasonBackward`, rules CRUD
- `rollouts` — rollout CRUD + `start`/`pause`/`resume`/`rollback`/`status`
- `rollups` — rollup CRUD + `execute`/`preview`/`result` + execution results
- `extract` — `analyze`/`architecture`/`coreferences`/`entities`/`events`/`relations`/`triplets`
- `events` — event log, checkpoints, and consumer leases

The graph subdomain remains served by `@frontal-labs/graph`. The old
model/migration/rule/mixin/generation surface (which called the catch-all
endpoint) is removed.
