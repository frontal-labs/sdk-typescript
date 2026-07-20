---
"@frontal-labs/sdk": major
---

Remove the `@frontal-labs/queues` and `@frontal-labs/organization` packages.

An audit of the Frontal backend confirmed neither has a public HTTP API:

- **queues** — both candidate backends (`events/backend/queue`, `compute/backend/jobs`)
  are gRPC-only (the queue service is a stub); there is no REST surface to build
  against.
- **organization** — there is no organization/team/member/role service. The
  fragments that exist live elsewhere (billing `/v1/tenants`, governance
  `/v1/roles`, auth `/admin/users`), so a cohesive `organization` client would be
  fabricated.

The umbrella `@frontal-labs/sdk` no longer exposes `sdk.queues` or
`sdk.organization`. These can be reintroduced if/when the backend gains a public
HTTP API (a queues gateway/transcoding layer, or a dedicated organization service).
