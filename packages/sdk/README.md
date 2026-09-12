# @frontal-labs/sdk

The one-package entry point to Frontal: AI inference, agents, workflows,
pipelines, knowledge graph, ontology, blob storage and 15 more services behind
a single typed client.

## Installation

```bash
bun add @frontal-labs/sdk
```

Works with `npm`, `pnpm` and `yarn` too. TypeScript-first; ESM and CJS builds
are included.

## Quick Start

```ts prelude
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

That is the whole setup: one import, one `apiKey`. Every service is a lazy,
cached getter on the `Frontal` instance:

| Getter | Service |
| --- | --- |
| `f.ai` | Text generation, streaming, embeddings, structured output |
| `f.agents` | Define, run and observe agents |
| `f.workflows` | Durable workflows with approval steps |
| `f.pipelines` | Data pipelines |
| `f.graph` / `f.ontology` | Knowledge graph and ontology |
| `f.blob` / `f.datasets` / `f.data` | Storage and data access |
| `f.lineage` / `f.observability` / `f.audit` | Tracing, logs, lineage, audit trail |
| `f.workers` / `f.sandbox` / `f.schedules` | Compute and scheduling |
| `f.events` / `f.webhooks` / `f.connectors` / `f.integrations` | Eventing and external systems |
| `f.auth` / `f.governance` / `f.billing` | Identity, policy, billing |

## Configuration

```ts
const f = new Frontal({
  apiKey: process.env.FRONTAL_API_KEY!,   // required, starts with `frt_`
  baseUrl: "https://api.frontal.dev/v1",  // default; or FRONTAL_API_URL
  env: "development",                     // "development" | "test" | "production"; or FRONTAL_ENV
  debug: false,                           // or FRONTAL_DEBUG=1
  timeout: 30_000,
  maxRetries: 3,
});
```

Invalid config (for example an API key without the `frt_` prefix) throws at
construction time, not on the first request.

| Variable | Purpose |
| --- | --- |
| `FRONTAL_API_KEY` | API key (`frt_...`) |
| `FRONTAL_API_URL` | Override the base URL |
| `FRONTAL_ENV` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | `1` / `true` enables verbose logging |

`SdkConfig` is also the shape a future `frontal.jsonc` will use; the SDK never
reads files itself.

## Error handling

Every API failure is a typed `FrontalError` subclass carrying `code`,
`requestId`, `statusCode` and an optional `docs` link:

```ts
import { Frontal, RateLimitError, ValidationError } from "@frontal-labs/sdk";

try {
  await f.ai.generateText({ model: "claude-sonnet-4-6", prompt: "hi" });
} catch (err) {
  if (err instanceof RateLimitError) console.log("retry in", err.retryAfter, "s");
  if (err instanceof ValidationError) console.log(err.fields);
}
```

## Advanced

### Share one connection with standalone packages

`f.client` is the underlying `FrontalClient`. Pass it to any
`createXClient` factory to reuse the same transport, retries and headers:

```ts
import { Frontal } from "@frontal-labs/sdk";
import { createBlobClient } from "@frontal-labs/blob";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const blob = createBlobClient(f.client);
```

### Install a single package

If you only need one service, each is published on its own
(`@frontal-labs/ai`, `@frontal-labs/agents`, ...). Same API, smaller install:

```ts
import { createAIClient } from "@frontal-labs/ai";

const ai = createAIClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Env-driven singletons (deprecated)

`import { frontal, ai } from "@frontal-labs/sdk"` still works and reads
`FRONTAL_API_KEY` on first use, but it is deprecated in favour of the explicit
constructor above. It will not be removed without a major version bump.

## Testing

`@frontal-labs/testing` provides a fetch-level mock and a pre-wired client:

```ts
import { Frontal } from "@frontal-labs/sdk";
import { createTestClient } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  { method: "GET", path: "/internal/models", body: { data: [] } },
]);
const f = new Frontal(client);
await f.ai.listModels();
mock.expectCalled("GET", "/internal/models");
```

See [`docs/TESTING.md`](../../docs/TESTING.md) for model mocks and scenarios.
