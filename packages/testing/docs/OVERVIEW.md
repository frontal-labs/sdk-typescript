# @frontal-labs/testing - Overview

`@frontal-labs/testing` provides test utilities for the Frontal SDK packages:
a fetch-level mock with route matching and request assertions, pre-wired test
clients, response builders, fixtures, a scripted language model, and scenario
helpers. Nothing touches the network and no real API key is needed.

The mocks sit at the transport layer. Test clients are real `FrontalClient` and
`HttpClient` instances whose `fetch` is replaced, so retries, snake/camel
transforms and typed errors behave as they do in production.

Test helpers that use `vi.fn()` (such as `createMockFetch`) require `vitest` to
be installed as a peer dependency (`vitest >= 1`).

## Response Model

SDK methods and `HttpClient` methods return the parsed result directly. They do
not return `{ data, error }` envelopes.

- `HttpClient.get`, `post`, `put`, `patch` and `delete` resolve to the parsed
  response body (typed by the optional Zod schema argument).
- Service methods (for example `ai.generateText(...)` or `agents.list(...)`)
  resolve to their result type.
- On failure, requests throw a `FrontalError` (exported from
  `@frontal-labs/core`) or one of its subclasses such as `NotFoundError` or
  `RateLimitError`.

Assert on the returned value and on thrown errors, not on a `.data` property.

```ts
import { FrontalError } from "@frontal-labs/core";
import { createTestHttpClient } from "@frontal-labs/testing";

const { http, mock } = createTestHttpClient([
  {
    method: "GET",
    path: "/agents/agt_1",
    status: 404,
    body: { code: "NOT_FOUND", message: "Agent not found", requestId: "req_1" },
  },
]);

try {
  await http.get("/agents/agt_1");
} catch (error) {
  if (error instanceof FrontalError) {
    console.log(error.statusCode); // 404
  }
}

mock.expectCalled("GET", "/agents/agt_1");
```

## Exports

| Export | Kind | Purpose |
|--------|------|---------|
| `createMockConfig()` | function | Returns a `MockConfig` (`apiKey`, `baseUrl`, `timeout`) for SDK config. |
| `setupTestEnvironment()` / `cleanupTestEnvironment()` | functions | Set or remove `NODE_ENV`, `CI` and `FRONTAL_API_KEY`. |
| `createMockFetch(routes?)` | function | Fetch mock that matches routes, records requests and exposes assertions. |
| `createTestClient(routes?)` | function | `{ client, mock }`, where `client` is a `FrontalClient` using the mock fetch. |
| `createTestHttpClient(routes?)` | function | `{ http, mock }`, where `http` is an `HttpClient` using the mock fetch. |
| `createIntegrationHarness(routes?)` | function | Shared mock for several services; `createHttp()` returns `{ http }`. |
| `matchPath(pattern, pathname)` | function | Path matcher used by routes (suffix match; `{param}` and `:param` segments). |
| `mockPageResponse(data, opts?)` | function | Paginated body (`data`, `pagination`, `meta`). |
| `integrationPage(data, opts?)` | function | Paginated body (`data`, `pagination`) for integration harness routes. |
| `mockErrorResponse(code, message, status?)` | function | Error body (`code`, `message`, `requestId`). |
| `fixtures` | object | Factories: `entity`, `agent`, `workflow`, `pipeline`, `model`, `functionEntry`. |
| `catchAllRoute(body?)` / `catchAllRoutes(body?)` | functions | Route(s) that answer any path with a page-shaped body. |
| `simulateStream(options)` / `mockStreamResponse(...)` | functions | Server-sent-event `Response` builders. |
| `mockLanguageModel(options?)` | function | Scripted chat model at the transport layer. |
| `createScenario(name, steps)` / `MockFrontal` | function / object | Ordered multi-step route scenarios. |
| `scenarioAliases` | object | Named aliases for scenario `on` keys. |

Types: `MockConfig`, `MockRoute`, `RequestLog`, `IntegrationHarness`,
`SimulateStreamOptions`, `MockLanguageModel`, `MockLanguageModelOptions`,
`MockGenerateResult`, `MockModelCall`, `Scenario`, `ScenarioStep`.

## Configuration

### MockConfig

```ts
import { createMockConfig, type MockConfig } from "@frontal-labs/testing";

const config: MockConfig = createMockConfig();
// {
//   apiKey: "frt_test-api-key-1234567890",
//   baseUrl: "https://api.test.frontal.dev",
//   timeout: 10_000,
// }
```

`createMockConfig()` returns plain values. Spread them into an SDK config when
a test needs one, and override fields as required:

```ts
import { createMockConfig } from "@frontal-labs/testing";

const config = { ...createMockConfig(), timeout: 5_000 };
```

### Environment

```ts
import { cleanupTestEnvironment, setupTestEnvironment } from "@frontal-labs/testing";

beforeAll(() => setupTestEnvironment());
afterAll(() => cleanupTestEnvironment());
```

`setupTestEnvironment()` sets `NODE_ENV="test"`, `CI="true"` and
`FRONTAL_API_KEY="frt_test-api-key-1234567890"`. `cleanupTestEnvironment()`
deletes those three variables.

## Mocking HTTP

### Routes

A `MockRoute` matches on `method` and `path`:

- `path` is a string (matched as a path suffix, with `{param}` or `:param`
  segments as single-segment wildcards) or a `RegExp`.
- `status` defaults to `200`. A `204` status returns no body.
- `body` is serialized as JSON. `headers` are added to the response.
- `handler(request)` receives the recorded `RequestLog` and may return a
  `Response`. Returning `undefined` falls through to `stream` or `body`.
- `times` serves a route at most N times, so routes for the same path can answer
  in order.
- Unmatched requests return `404` with a `NOT_FOUND` body.

```ts
import { createTestClient, mockPageResponse } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  {
    method: "GET",
    path: "/agents",
    body: mockPageResponse([{ id: "agt_1", name: "triage" }]),
  },
  {
    method: "POST",
    path: "/agents",
    handler: (req) => Response.json({ id: "agt_2", ...(req.body as object) }),
  },
]);
```

### Assertions

`createMockFetch` (and the `mock` handle returned by the client factories)
exposes:

- `requests: RequestLog[]` - every recorded request (`method`, `url`, `path`,
  `body`, `headers`). Bodies are parsed JSON with keys converted to camelCase.
- `expectCalled(method, pathSubstring)` - returns the matching `RequestLog` or
  throws.
- `expectCalledWith(method, pathSubstring, body)` - checks that the listed body
  keys match.
- `callCount(method, pathSubstring)` - number of matching requests.
- `reset()` - clears recorded requests and served counts.

```ts
import { createMockFetch } from "@frontal-labs/testing";

const mock = createMockFetch([
  { method: "POST", path: "/ai/chat/completions", body: { choices: [] } },
]);

await mock.fetch("https://api.test.frontal.dev/v1/ai/chat/completions", {
  method: "POST",
  body: JSON.stringify({ model: "x" }),
});

mock.expectCalledWith("POST", "/ai/chat/completions", { model: "x" });
console.log(mock.callCount("POST", "/ai/chat/completions")); // 1
mock.reset();
```

### Test clients

```ts
import { createTestClient, createTestHttpClient } from "@frontal-labs/testing";
import { createAIClient } from "@frontal-labs/ai";

const { client } = createTestClient(); // FrontalClient
const { http } = createTestHttpClient(); // HttpClient, what service SDK classes take

const ai = createAIClient(client);
```

`createTestClient` and `createTestHttpClient` use `maxRetries: 0` and
`retryDelay: 0`, so retry-related tests stay fast and deterministic.

## Service Tests

Service methods take an options object and return their result directly.
`ai.generateText` takes `{ model, prompt }`, not a string:

```ts
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";
import { createAIClient } from "@frontal-labs/ai";

const model = mockLanguageModel({ doGenerate: () => ({ text: "Hello" }) });
const ai = createAIClient(createTestClient(model.routes).client);

const { text } = await ai.generateText({ model: "any", prompt: "hi" });

console.log(text); // "Hello"
console.log(model.calls.length); // 1
console.log(model.calls[0]?.messages); // the messages sent for the prompt
```

Use `mockLanguageModel` for chat/completion flows. `doStream` scripts
`streamText`; by default it streams `doGenerate().text` word by word.

To test a service method that is not AI-specific, route its endpoint and assert
on the returned value:

```ts
import { Frontal } from "@frontal-labs/sdk";
import { createTestClient, mockPageResponse } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  {
    method: "GET",
    path: "/agents",
    body: mockPageResponse([{ id: "agt_1", name: "triage" }]),
  },
]);

const f = new Frontal(client);
const page = await f.agents.list({ limit: 10 });

mock.expectCalled("GET", "/agents");
```

### Integration across services

`createIntegrationHarness` shares one mock fetch and request log across several
services:

```ts
import { createIntegrationHarness, integrationPage } from "@frontal-labs/testing";
import { WebhooksSdk } from "@frontal-labs/webhooks";

const harness = createIntegrationHarness([
  {
    method: "GET",
    path: "/webhooks/endpoints",
    body: integrationPage([{ id: "wh_1" }]),
  },
]);

const webhooks = new WebhooksSdk(harness.createHttp().http);
await webhooks.endpoints.list();

harness.expectCalled("GET", "/webhooks/endpoints");
```

### Streams

```ts
import { createTestClient, simulateStream } from "@frontal-labs/testing";

const res = simulateStream({
  chunks: [{ event: "step", data: { name: "classify" } }, "[DONE]"],
  chunkDelayMs: 5,
});

const { client } = createTestClient([
  {
    method: "GET",
    path: "/agents/runs/{param}/stream",
    stream: { chunks: [{ event: "completed", data: {} }] },
  },
]);
```

### Scenarios

`createScenario` (also `MockFrontal.scenario`) answers steps for the same
endpoint in order:

```ts
import { MockFrontal } from "@frontal-labs/testing";

const s = MockFrontal.scenario("happy-path", [
  { on: "agents.message", return: { id: "run_1", status: "running" } },
  { on: "agents.run", return: { id: "run_1", status: "completed" } },
]);

// Use s.client with an SDK, then:
s.assertAllHit();
```

`on` is either a key from `scenarioAliases` or a `"METHOD /path"` string.
`assertAllHit()` throws if any step was not consumed.

## Fixtures and Response Builders

```ts
import { fixtures, mockErrorResponse, mockPageResponse } from "@frontal-labs/testing";

const agent = fixtures.agent({ name: "triage" });
const entity = fixtures.entity({ type: "customer" });

const page = mockPageResponse([{ id: "a" }, { id: "b" }], {
  cursor: "next",
  hasMore: true,
  total: 42,
});

const err = mockErrorResponse("RATE_LIMITED", "Slow down", 429);
```

Each `fixtures` factory accepts an object of overrides that is merged into the
generated record. Fixture values are plain objects, not SDK types.

## Vitest Setup

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
  },
});
```

```ts
// tests/setup.ts
import { setupTestEnvironment } from "@frontal-labs/testing";

setupTestEnvironment();
```

If a test needs the global `fetch` to be a mock, pass `mock.fetch` to the
client (via `createTestClient` or `createTestHttpClient`) instead of stubbing
`globalThis.fetch`.

## Best Practices

1. Mock at the transport boundary (routes or `mock.fetch`), not inside SDK
   internals.
2. Assert on returned values and on `FrontalError` subclasses, not on envelope
   fields.
3. Use `mockPageResponse` and `integrationPage` bodies that match the paginated
   shape the SDK parses.
4. Call `mock.reset()` between tests when a mock is shared.
5. Keep test credentials to the mock values from `createMockConfig()`; never use
   real keys in fixtures.

## Related Docs

- [README](../README.md) - quick start and package overview
- [Core API reference](../../core/docs/API-REFERENCE.md) - `FrontalError` and client types
