# Frontal SDK Alignment Plan — audit, governance, workers, sandbox, queues, organization

> Scope: audit the real Frontal backend, expose the missing services through the
> public API gateway, and align/build the six remaining SDKs. Includes the
> `functions → workers` rebrand decision.

## 0. The key discovery: the gateway *is* the public API contract

`api.frontal.dev` is served by a **geographic router** (`internal/backend/router`,
Cloudflare Worker) that forwards to regional instances of the **REST gateway**
(`internal/backend/rest-gateway/src/worker.ts`, Hono Worker). The gateway's
`workerUpstreams` array is the **authoritative list of publicly-routable services**.

Before this change it routed only 10 prefixes:
`/v1/auth`, `/v1/billing`, `/v1/ai/models`, `/v1/ai/inference`, `/v1/agents`,
`/v1/webhooks`, `/v1/integrations`, `/v1/workflows`, `/v1/compliance`, `/v1/policies`.

So the six target services (and also ontology/data/events/observability/storage from
earlier SDK work) were **implemented but not publicly routed** — exactly the
"outdated API" gap. The published OpenAPI spec is aspirational relative to this
gateway. **The gateway upstream list, not the spec, is the source of truth for what
is callable.**

## 1. Backend audit — real public HTTP surface per service

| Service | Backend | Framework | Real HTTP routes (internal) | Gatewayed? |
| --- | --- | --- | --- | --- |
| **audit** | `governance/backend/audit` | Go / Gin | `POST /v1/audit/events`, `POST /v1/audit/events/batch`, `GET /v1/audit/events` (filters: actor_id, action, run_id, event_domain, event_type, resource_type, outcome, from, to, page_size, offset), `GET /v1/audit/events/:id` | **added** |
| **governance / policies** | `governance/backend/policies` | Express | `POST/GET /v1/policies`, `GET/PUT/DELETE /v1/policies/:id`, `GET /v1/policies/:id/versions`, `GET /v1/policies/templates`, `POST /v1/policies/from-template`, `POST /v1/policies/validate` | already |
| **governance / compliance** | `governance/backend/compliance` | Express | `GET /v1/compliance/frameworks`, `POST/GET /v1/compliance/assessments`, `GET /v1/compliance/assessments/:id`, `GET /v1/compliance/violations`, `POST /v1/compliance/violations/:id/resolve`, `GET /v1/compliance/score` | already |
| **governance / access-control (RBAC)** | `governance/backend/access-control` | NestJS | `GET/POST /v1/roles`, `GET/DELETE /v1/roles/:id`, `GET/POST /v1/permissions`, `GET /v1/permissions/:id`, `POST /v1/access/check` | **added** |
| **workers** (was "functions") | `compute/backend/edge-runtime` | Rust / Hyper + Deno V8 | `POST /v1/workers` (deploy: JSON `{name,code,entrypoint?,env_vars?}` or `application/eszip`), then invoke deployed workers by request path | **added** |
| **sandbox** | `compute/backend/sandbox` | Rust / Axum (+ Tonic gRPC) | `POST /self-test`, `POST /submit`, `GET /languages`, `GET /metrics` — **served at root, no `/v1`** | **added (with prefix-strip rewrite)** |
| **queues** | `events/backend/queue` (Go) + `compute/backend/jobs` (Rust) | — | **gRPC-only, no HTTP** (queue service is a stub) | ❌ not possible |
| **organization** | none cohesive | — | No org/team/member/role HTTP service. Fragments: billing `/v1/tenants/:id`, governance `/v1/roles`, auth `/admin/users` | ❌ not a service |

Governance also has **approvals**, **enforcement**, and **bundle** services — all
**gRPC-only**, so not REST-gatewayable without transcoding.

## 2. Gateway changes (DONE — `internal/backend/rest-gateway/src/worker.ts`)

Added upstreams (endpoint values are Cloudflare Worker secrets set at deploy time):

| Public prefix | Upstream env var | Notes |
| --- | --- | --- |
| `/v1/audit` | `GOVERNANCE_AUDIT_HTTP_ENDPOINT` | pass-through |
| `/v1/roles`, `/v1/permissions`, `/v1/access` | `GOVERNANCE_ACCESS_CONTROL_HTTP_ENDPOINT` | three prefixes → one upstream |
| `/v1/workers` | `EDGE_RUNTIME_HTTP_ENDPOINT` | pass-through |
| `/v1/sandbox` | `SANDBOX_HTTP_ENDPOINT` | **rewrite** `/v1/sandbox/*` → `/*` (service serves at root) |

Also fixed a **latent routing bug**: the proxy only registered `${prefix}/*`, which
Hono does **not** match against the bare prefix — so collection-root endpoints like
`POST /v1/policies` (create) and `POST /v1/workers` (deploy) would 404. The handler
is now registered for **both** `${prefix}` and `${prefix}/*`. Added gateway tests
for audit pass-through, the sandbox rewrite, the workers 501, and the root-prefix fix
(13/13 passing).

**Deployment follow-up (ops, not code):** set `GOVERNANCE_AUDIT_HTTP_ENDPOINT`,
`GOVERNANCE_ACCESS_CONTROL_HTTP_ENDPOINT`, `EDGE_RUNTIME_HTTP_ENDPOINT`, and
`SANDBOX_HTTP_ENDPOINT` as Worker secrets/vars per environment.

## 3. Per-SDK plan

### 3a. `audit` — trim to the real events API ✅ buildable now
Backend is events-only. Reshape `AuditService` to:
- `events.create(event)` → `POST /audit/events`
- `events.createBatch(events)` → `POST /audit/events/batch`
- `events.list(filters)` → `GET /audit/events` (paginated; expose the real filters)
- `events.get(id)` → `GET /audit/events/:id`

Remove the fabricated `compliance`, `reports`, and `trails` namespaces (compliance
lives in the governance SDK). Align the `AuditEvent` type to the real fields
(actor_id, actor_type, action, event_domain, event_type, resource_type, resource_id,
outcome, run_id, sequence, ip_address, user_agent, request_id, idempotency_key,
tenant_id, metadata). **Breaking → major changeset.**

### 3b. `governance` — re-prefix + fill the real surface ✅ buildable now
Re-prefix to the real gateway paths (drop the invented `/governance` and `/rbac`):
- `policies.*` → `/policies*`: add `versions(id)`, `templates()`, `fromTemplate(body)`,
  `validate(body)`; **remove** the fabricated `enable`/`disable`/`evaluate`.
- `compliance.*` → `/compliance*`: `frameworks()`, `assessments.create/get/list`,
  `violations.list/resolve`, `score()`.
- `accessControl` (RBAC) → real paths: `roles.list/create/get/delete` (`/roles*`),
  `permissions.list/create/get` (`/permissions*`), `access.check(body)`
  (`/access/check`). Replace the invented `rbac.bindings`/`rbac.check`.
**Breaking → major changeset.**

### 3c. `functions → workers` — rebrand + real API ✅ buildable now
Rename the package to **`@frontal-labs/workers`** (see §4). Real API is intentionally
minimal:
- `deploy({ name, code, entrypoint?, envVars? })` → `POST /workers` (JSON) — plus an
  `deployBundle(name, eszip)` variant posting `application/eszip` with `x-worker-name`.
- `invoke(name, request)` / a thin fetch helper → calls the worker's route under
  `/workers/...` (execution proxy).
Remove the fabricated CRUD/`triggers`/`stats`. Keep it small and honest; expand only
when the edge-runtime exposes management endpoints. **Breaking → major changeset.**

### 3d. `sandbox` — redesign to the code-judge model ✅ buildable now (needs redesign)
The real service is a **compile-and-judge** engine, not a VM/file manager. Replace the
fabricated `sandboxes`/`templates`/`files` API with:
- `languages()` → `GET /sandbox/languages`
- `selfTest({ language, code, stdin, resources? })` → `POST /sandbox/self-test`
  → `{ compile, summary }`
- `submit({ language, code, judge, task/cases, resourceLimits?, tier? })`
  → `POST /sandbox/submit` → `{ compile, cases[], summary }`
Model the request/response types from the audited proto/JSON shapes (compile report,
per-case verdicts, judge result enums, resource-limit cascade). **Breaking → major.**

### 3e. `queues` — remove (no public HTTP API) ❌
Both candidate backends are **gRPC-only** and the events queue is a stub. There is no
REST surface to build against. **Recommend removing the package** (as with
`flags`/`vectors`/`search`), or keeping it internal-only. Revisit if/when a queues
HTTP gateway or gRPC-transcoding layer is added. Document the rationale in a changeset.

### 3f. `organization` — remove or redefine as a thin facade ❌/⚠️
There is **no organization/team/member/role service**. Options:
1. **Remove** the package (cleanest; matches reality today).
2. **Redefine narrowly** as a facade over what *does* exist: `tenants` (billing
   `/v1/tenants/:id`, `PUT /v1/tenants/update`) and `roles` (governance `/v1/roles`).
   Drop teams/members/invitations entirely until a real service exists.
Recommendation: **remove now**; reintroduce a real `organization` SDK only when an
org/tenant management service is built and gatewayed.

## 4. Should we rebrand `functions` → `workers`? **Yes.**

The backend already calls them **Workers**: the service is `compute-edge-runtime`
serving `/v1/workers`, the README says "Frontal Workers", and the code models
`UserWorker`/`MainWorker`/`EventsWorker`. There is **no** `/functions` route or
"functions" terminology anywhere in the runtime. Keeping the SDK named `functions`
would permanently diverge from the product's own vocabulary and the real path.

Rebrand mechanics:
- New package `@frontal-labs/workers`; `WorkersService`; base env `FRONTAL_WORKERS_API_URL`.
- Umbrella: expose `sdk.workers`; keep a **deprecated `sdk.functions` alias** for one
  minor cycle that re-exports `workers` and logs a deprecation warning, then remove.
- Update tsconfig/vitest/commitlint/docs; major changeset noting the rename.

## 5. Sequencing

1. **Gateway (done)** — merge the rest-gateway change; ops sets the four endpoint secrets.
2. **Re-sync contracts** — regenerate the public OpenAPI so it reflects the newly-routed
   services, then `bun run contract:sync` in the SDK repo (unblocks measurable coverage).
3. **SDKs, in order of confidence:** governance → audit → workers(rebrand) → sandbox(redesign).
4. **Remove** `queues` and `organization` (with changesets explaining the missing backends).
5. Per package: exact method→(verb,path) unit tests, real request/response types, README +
   example, changeset. Extend the conformance tooling's package list automatically (already
   auto-discovers `packages/*`).

## 6. Net effect on the SDK

- **4 real SDKs** aligned/built: governance, audit, workers, sandbox.
- **2 packages removed** for having no public backend: queues, organization.
- **1 rebrand**: functions → workers.
- The public API gateway now actually routes audit, RBAC, workers, and sandbox, so
  these SDKs will work against `api.frontal.dev` instead of 404-ing.
