---
name: frontal-sdk
description: Write, review and test TypeScript that uses the Frontal SDK (@frontal-labs/sdk and the per-service @frontal-labs/* packages). Use whenever code calls Frontal AI, agents, workflows, pipelines, blob or any other Frontal service.
---

# Frontal SDK

How to write correct code against the Frontal TypeScript SDK: setup, service map, model choice, error taxonomy, testing, and the checklist to run before returning code.

## Rule zero

Never write Frontal SDK code from memory. Check the installed version and read
the matching README before generating code:

```bash
bun pm ls @frontal-labs/sdk        # or: npm ls @frontal-labs/sdk
cat node_modules/@frontal-labs/sdk/README.md
```

Every code block in this repository's READMEs is type-checked in CI, so the
README for the installed version is the ground truth; `docs/mcp.json` at the
repo root indexes all of them.

## Canonical setup

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
```

- `apiKey` must start with `frt_`; invalid config throws a `ZodError` at
  construction, not on the first call.
- Optional: `baseUrl`, `env` (`"development" | "test" | "production"`),
  `debug`, `timeout`, `maxRetries`, `headers`, `fetch`, `logger`.
- Env fallbacks: `FRONTAL_API_URL`, `FRONTAL_ENV`, `FRONTAL_DEBUG`.
- Do **not** use the env-driven singletons (`import { ai } from "@frontal-labs/ai"`,
  `import { frontal } from "@frontal-labs/sdk"`). They still work but are
  deprecated; explicit construction is testable and unambiguous.

## Service map

Every service is a lazy, cached getter on `Frontal`:

| Getter | Package | Use for |
| --- | --- | --- |
| `f.ai` | `@frontal-labs/ai` | `generateText`, `streamText`, `embed`, `generateObject`, speech/image/video |
| `f.agents` | `@frontal-labs/agents` | `define(name)` builder, `use(id).message/watch/waitForCompletion/conversation` |
| `f.workflows` | `@frontal-labs/workflows` | `define(name)` builder, workflow lifecycle, executions and approvals |
| `f.pipelines` | `@frontal-labs/pipelines` | `define`, `use(id).trigger/backfill/health` |
| `f.ontology` | `@frontal-labs/ontology` | `engine.generate`, `objects`, `versions`, `rollouts` |
| `f.blob` | `@frontal-labs/blob` | `upload`, `download`, `getSignedUrl`, `getMetadata`, `list` |
| `f.data` | `@frontal-labs/data` | aggregations/quality/exports/query |
| `f.lineage` | `@frontal-labs/lineage` | `graph.get`, `nodes.trace`, `impact.analyzeChange` |
| `f.observability` | `@frontal-labs/observability` | `logs.query`, `metrics`, `traces.get`, `alerts`, `dashboards` |
| `f.audit` | `@frontal-labs/audit` | `log`, `events.list` |
| `f.governance` | `@frontal-labs/governance` | `policies`, `compliance`, `roles`, `permissions`, `access.check` |
| `f.auth` | `@frontal-labs/auth` | `signInWithPassword`, `mfa`, `account`, `admin` |
| `f.billing` | `@frontal-labs/billing` | `customers`, `plans`, `subscriptions`, `invoices`, `meters` |
| `f.webhooks` | `@frontal-labs/webhooks` | `endpoints`, `deliveries` |
| `f.schedules` | respective packages | cron; `selfTest`/`submit` |
| `f.connectors` | `@frontal-labs/connectors` | source connectors |

React UIs: `@frontal-labs/react` — `useChat({ api })` over a route that returns
`toUIMessageStreamResponse(f.ai.streamText(...))`; `useAgentRun(agent)`;
`useWorkflowApprovals(f.workflows)`. Agents are event-driven, not chat.

Single-package usage: `import { createAIClient } from "@frontal-labs/ai"` then
`createAIClient({ apiKey })` or `createAIClient(f.client)` to share one
transport.

## Model switch

| Task | Model id |
| --- | --- |
| Default, best quality | `claude-opus-5` |
| Fast, cheap, most tasks | `claude-sonnet-5` |
| Cheapest / classification | `claude-haiku-4-5-20251001` |

Pass `model` on every `f.ai.*` call. `f.ai.listModels()` returns what the
gateway currently serves — prefer it over a hard-coded list in long-lived code.

## Error taxonomy

All API failures throw a `FrontalError` subclass from `@frontal-labs/core`
(re-exported by `@frontal-labs/sdk`):

| Class | Status | Extra fields |
| --- | --- | --- |
| `ValidationError` | 400 | `fields: { field, message }[]` |
| `UnauthorizedError` | 401 | — |
| `ForbiddenError` | 403 | — |
| `NotFoundError` | 404 | — |
| `ConflictError` | 409 | — |
| `RateLimitError` | 429 | `retryAfter` (seconds), `rateLimit` |
| `ServiceError` | 5xx | — |
| `NetworkError` | — | `cause` (not a `FrontalError`; request never reached the API) |
| `TimeoutError` | — | — |

Every `FrontalError` has `code`, `message`, `requestId`, `statusCode`,
`retryable`, an optional `fix` hint and an optional `docs` URL. Streams
(`ai.streamText().fullStream`, `agents.use(id).watch()`) never throw
mid-stream: they yield `{ type: "error", error }` parts, then `done`. Log
`requestId`; it correlates with
`f.observability.logs.query({ query: \`requestId:"..."\` })`.

```ts
import { Frontal, RateLimitError, ValidationError } from "@frontal-labs/sdk";

try {
  await f.ai.generateText({ model: "claude-sonnet-5", prompt: "hi" });
} catch (err) {
  if (err instanceof RateLimitError) {
    await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
  } else if (err instanceof ValidationError) {
    console.error(err.fields);
  } else {
    throw err;
  }
}
```

Client-side schema failures (bad options) throw `ZodError`, not `FrontalError`.

## Testing

Mock at the `fetch` layer with `@frontal-labs/testing`; never use a real key
in tests. `FRONTAL_API_KEY=frt_test_key` satisfies validation.

```ts
import { Frontal } from "@frontal-labs/sdk";
import { createTestClient, mockPageResponse } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  { method: "GET", path: "/agents", body: mockPageResponse([{ id: "agt_1" }]) },
]);
const f = new Frontal(client);
await f.agents.list({ limit: 1 });
mock.expectCalled("GET", "/agents");
```

See `docs/TESTING.md` for streaming and multi-service recipes.

## Conventions

- Request/response keys are camelCase in TypeScript; the SDK converts to
  snake_case on the wire. Never hand-write `snake_case` keys.
- Options types derive from Zod with `z.input`, so defaulted fields are optional.
- Paginated methods return `PageResult<T>` with `data`, `pagination.hasMore`,
  `pagination.cursor` and `nextPage()`; they are also async-iterable.
- Long-running operations: prefer `use(id).waitForCompletion(runId)` or
  `pollUntil` from `@frontal-labs/core` over hand-rolled loops.
- Streams (`agents.use(id).watch`, `ai.streamText`) are `for await`-able and
  yield discriminated parts; switch on `part.type`.
- Tools: `tool({ description, inputSchema, execute })` from `@frontal-labs/ai`;
  pass as `tools` to `generateText`/`streamText` or `agents.define(name, { tools })`.
  With `maxSteps > 1` the SDK runs tools that have `execute` and loops;
  otherwise it returns `toolCalls` for you to run (`parseToolInput` validates).
- Observability: `registerTelemetry({ tracer, onError })` once at startup;
  `requestIdOf(result)` gives the id to search logs/traces with.

## Checklist before returning code

1. `new Frontal({ apiKey })`, not a singleton.
2. Method names verified against the installed package's README or `.d.ts`.
3. Errors handled by class, `requestId` surfaced.
4. Tests use `createTestClient`, no network.

## Extend this monorepo

For work inside the SDK repository, follow `AGENTS.md` and the closest service package. The common package layout is `client.ts` (factory and compatibility exports), `sdk.ts` (service class using `HttpClient`), `schemas.ts` (Zod definitions), `constants.ts`, and `index.ts`. Keep service behavior in `packages/<service>` and shared transport/errors in `packages/core`; `packages/sdk` owns lazy getters on `Frontal`, and `packages/testing` owns fetch-level mocks.

Use the committed endpoint inventory and OpenAPI snapshots for route behavior. Keep Zod schemas and exported input/output types aligned, including optional inputs for defaulted fields. Add contract coverage with behavior changes, executable README examples for public APIs, and a Changeset for publishable package changes. Follow Biome and the repository's Bun workspace setup.

Every TypeScript block in root/package READMEs and `examples/SDKS_GUIDE.md` is exercised by `bun run test:examples`. After editing those docs, use `ts prelude` only when later snippets need shared setup, and use a `// TODO(example): reason` line for any intentionally skipped snippet. Regenerate `docs/mcp.json` with `bun run docs:manifest` whenever README content changes. Consult `docs/ARCHITECTURE.md`, `docs/TESTING.md`, and `CONTRIBUTING.md` before structural changes.

Useful repository checks:

```bash
bun run build
bun run test
bun run test:examples
bun run lint
bun run type-check
bun run contract:endpoints
bun run contract:matrix
```
