# Frontal TypeScript SDK

![Frontal Banner](./banner.png)

[![skills.sh](https://skills.sh/b/frontal-labs/sdk-typescript)](https://skills.sh/frontal-labs/sdk-typescript)

Build governed, observable AI systems on Frontal: AI inference, agents,
durable workflows, pipelines, ontology, storage and 10 more services —
from one typed client.

## Quickstart

```bash
bun add @frontal-labs/sdk
```

```ts
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const { text } = await f.ai.generateText({
  model: "claude-sonnet-4-6",
  prompt: "Summarize this incident report in one line.",
});

const agent = f.agents.use("agt_ticket_triager");
const run = await agent.message("support.ticket.created", { ticketId: "t_987" });

for await (const event of agent.watch(run.id)) {
  if (event.type === "event") console.log(event.event, event.data);
  if (event.type === "error") console.error(event.error.code, event.error.retryable);
}
```

That is the whole setup. Set `FRONTAL_API_KEY` (a `frt_...` key) and go. The
full quickstart, configuration and error-handling guide lives in
[`packages/sdk/README.md`](./packages/sdk/README.md); the end-to-end guide for
every service is [`examples/SDKS_GUIDE.md`](./examples/SDKS_GUIDE.md).

Building a UI? [`@frontal-labs/react`](./packages/react) gives you `useChat` in
two files. Copy-paste starters live in [`templates/`](./templates): `chatbot`,
`agent-approval`, `pipeline-graph`, `cron-export` — each is tested against
mocks in CI.

Writing code with an AI assistant? Point it at [`SKILL.md`](./SKILL.md);
[`docs/mcp.json`](./docs/mcp.json) lists every doc and headline operation.

## Why Frontal SDK

- **One import.** `f.ai`, `f.agents`, `f.workflows`, ... are lazy, typed getters on a single client.
- **Typed end to end.** Zod-validated requests and responses; every API error is a `FrontalError` subclass with `code`, `requestId` and `statusCode`.
- **Testable without a backend.** `@frontal-labs/testing` mocks at the `fetch` layer so retries, transforms and errors behave exactly as in production.
- **Docs that can't rot.** Every code block in these READMEs is extracted and type-checked in CI; the quickstart above runs against mocks on every PR.
- **ESM + CJS, Node 18+ compatibility, Bun, and Fetch/Web Crypto compatible
  edge runtimes.** CI loads built package entries on Node 22 and 24 LTS. Use a
  Node release that is still supported for production deployments.

## Packages

Install `@frontal-labs/sdk` for everything, or a single package if you only
need one service. Every package exposes a `createXClient()` factory that accepts
`{ apiKey }` or a shared `FrontalClient`.

| Package | Description | Version |
| :--- | :--- | :--- |
| [`@frontal-labs/sdk`](./packages/sdk) | Unified client — every service behind `new Frontal({ apiKey })`. Start here. | ![npm](https://img.shields.io/npm/v/@frontal-labs/sdk) |
| [`@frontal-labs/core`](./packages/core) | Transport, auth, retries, pagination, polling, typed errors. | ![npm](https://img.shields.io/npm/v/@frontal-labs/core) |
| [`@frontal-labs/react`](./packages/react) | `useChat`, `useAgentRun`, `useWorkflowApprovals` hooks. | ![npm](https://img.shields.io/npm/v/@frontal-labs/react) |
| [`@frontal-labs/testing`](./packages/testing) | Fetch-level mocks, model mocks, scenarios, fixtures. | ![npm](https://img.shields.io/npm/v/@frontal-labs/testing) |
| [`@frontal-labs/ai`](./packages/ai) | Text generation, streaming, embeddings, structured output, speech, images. | ![npm](https://img.shields.io/npm/v/@frontal-labs/ai) |
| [`@frontal-labs/agents`](./packages/agents) | Define, run, watch and version agents. | ![npm](https://img.shields.io/npm/v/@frontal-labs/agents) |
| [`@frontal-labs/workflows`](./packages/workflows) | Durable workflows with approval, condition and parallel steps. | ![npm](https://img.shields.io/npm/v/@frontal-labs/workflows) |
| [`@frontal-labs/pipelines`](./packages/pipelines) | Data pipelines, runs, backfills, health. | ![npm](https://img.shields.io/npm/v/@frontal-labs/pipelines) |
| [`@frontal-labs/ontology`](./packages/ontology) | Ontology engine, object types, versions and rollouts. | ![npm](https://img.shields.io/npm/v/@frontal-labs/ontology) |
| [`@frontal-labs/blob`](./packages/blob) | Object storage: upload, download, signed URLs. | ![npm](https://img.shields.io/npm/v/@frontal-labs/blob) |
| [`@frontal-labs/data`](./packages/data) | Aggregations, enrichment, quality, exports, federated query. | ![npm](https://img.shields.io/npm/v/@frontal-labs/data) |
| [`@frontal-labs/lineage`](./packages/lineage) | Lineage graph, traces, impact analysis. | ![npm](https://img.shields.io/npm/v/@frontal-labs/lineage) |
| [`@frontal-labs/observability`](./packages/observability) | Logs, metrics, traces, alerts, dashboards. | ![npm](https://img.shields.io/npm/v/@frontal-labs/observability) |
| [`@frontal-labs/audit`](./packages/audit) | Append-only audit events. | ![npm](https://img.shields.io/npm/v/@frontal-labs/audit) |
| [`@frontal-labs/governance`](./packages/governance) | Policies, compliance, roles, permissions, access checks. | ![npm](https://img.shields.io/npm/v/@frontal-labs/governance) |
| [`@frontal-labs/auth`](./packages/auth) | Sign-in, MFA, account and admin user management. | ![npm](https://img.shields.io/npm/v/@frontal-labs/auth) |
| [`@frontal-labs/billing`](./packages/billing) | Customers, plans, subscriptions, invoices, meters. | ![npm](https://img.shields.io/npm/v/@frontal-labs/billing) |
| [`@frontal-labs/webhooks`](./packages/webhooks) | Endpoints, deliveries, secrets, stats. | ![npm](https://img.shields.io/npm/v/@frontal-labs/webhooks) |
| [`@frontal-labs/schedules`](./packages/schedules) | Cron schedules and triggers. | ![npm](https://img.shields.io/npm/v/@frontal-labs/schedules) |
| [`@frontal-labs/connectors`](./packages/connectors) | Source connectors and per-tenant installations. | ![npm](https://img.shields.io/npm/v/@frontal-labs/connectors) |

## Contributing

### Prerequisites

- [Bun](https://bun.sh) v1.3.8+ (Node 18+ compatibility for consumers; use a
  currently supported Node LTS release in production)
- [Git](https://git-scm.com)

### Development setup

```bash
git clone https://github.com/frontal-labs/sdk-typescript.git
cd sdk-typescript
bun install
bun run build
```

A Nix shell is available too: `nix develop`.

### Development commands

```bash
bun run build            # build all packages (tsup + tsc declarations)
bun run test             # vitest, all packages
bun run test:examples    # type-check + run every README code block
bun run lint             # biome
bun run format           # biome --write
bun run type-check       # tsc --noEmit per package
bun run runtime:smoke    # load built ESM and CommonJS package entries on Node
bun run docs:manifest    # regenerate docs/mcp.json
bun run contract:endpoints   # SDK ↔ OpenAPI conformance gate
bun run contract:matrix      # regenerate migration matrix
bun run changeset        # record a version bump
```

CI runs format, build, lint, type-check, tests, README examples, docs
freshness and the contract gates on every PR. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`docs/`](./docs) for architecture,
testing, publishing and release notes.
See [`docs/ENTERPRISE_READINESS.md`](./docs/ENTERPRISE_READINESS.md) for the
repository's verified controls and open enterprise qualification items.

### Environment

| Variable | Purpose |
| --- | --- |
| `FRONTAL_API_KEY` | API key (`frt_...`) |
| `FRONTAL_API_URL` | Override base URL (default `https://api.frontal.dev/v1`) |
| `FRONTAL_ENV` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | `1` / `true` for verbose logging |

### Live backend compatibility check

Opt-in smoke test against a real backend:

```bash
FRONTAL_API_KEY=frt_... bun run test:live
```

Optional: `FRONTAL_BLOB_BUCKET` (for `blob.list`).

## Agent skills

Install this repository's TypeScript-specific agent skills with the [skills CLI](https://skills.sh/docs/cli):

```bash
npx skills add frontal-labs/sdk-typescript
```

## License

Apache-2.0 — see [LICENSE.md](./LICENSE.md).
