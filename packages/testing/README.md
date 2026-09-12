# @frontal-labs/testing

Test utilities for every Frontal SDK: a fetch-level mock with route matching
and request assertions, pre-wired test clients, response builders and
fixtures. No network, no real API key.

## Installation

```bash
bun add -d @frontal-labs/testing
```

Peer dependency: `vitest >= 1`.

## Quick Start

```ts prelude
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

`createTestClient(routes)` returns a real `FrontalClient` whose `fetch` is the
mock, so everything downstream (retries, snake/camel transforms, typed errors)
behaves exactly as in production.

## API

### `createMockFetch(routes)`

The core primitive. Matches requests by method and path (string substring or
`RegExp`) and returns JSON responses.

```ts
import { createMockFetch } from "@frontal-labs/testing";

const mock = createMockFetch([
  { method: "POST", path: "/ai/chat/completions", body: { choices: [] } },
  { method: "GET", path: /\/agents\/agt_\w+$/, status: 404, body: { code: "NOT_FOUND" } },
]);

// Hand `mock.fetch` to any client.
const res = await mock.fetch("https://api.test/v1/agents/agt_1");
console.log(res.status); // 404

mock.expectCalled("GET", "/agents/agt_1");
mock.expectCalledWith("POST", "/ai/chat/completions", { model: "x" }); // asserts body subset
console.log(mock.callCount("GET", "/agents"));
console.log(mock.requests); // [{ method, url, path, body, headers }]
mock.reset();
```

Unmatched routes return a `404` with a `NOT_FOUND` body, so a typo in a path
surfaces as a `NotFoundError` rather than a hang.

### `createTestClient(routes)` / `createTestHttpClient(routes)`

```ts
import { createTestClient, createTestHttpClient } from "@frontal-labs/testing";
import { createAIClient } from "@frontal-labs/ai";

const { client } = createTestClient();       // FrontalClient
const { http } = createTestHttpClient();     // HttpClient (what *Sdk classes take)

const ai = createAIClient(client);
```

### Response builders

```ts
import { mockErrorResponse, mockPageResponse } from "@frontal-labs/testing";

const page = mockPageResponse([{ id: "a" }, { id: "b" }], {
  cursor: "next",
  hasMore: true,
  total: 42,
});

const err = mockErrorResponse("RATE_LIMITED", "Slow down");
```

Use `status` on the route to control the HTTP status:

```ts
import { createTestClient, mockErrorResponse } from "@frontal-labs/testing";
import { RateLimitError } from "@frontal-labs/core";

const { client } = createTestClient([
  {
    method: "GET",
    path: "/health",
    status: 429,
    body: mockErrorResponse("RATE_LIMITED", "Slow down"),
    headers: { "retry-after": "5" },
  },
]);

try {
  await client.get("/health");
} catch (e) {
  if (e instanceof RateLimitError) console.log(e.retryAfter); // 5
}
```

### Fixtures

```ts
import { fixtures } from "@frontal-labs/testing";

const agent = fixtures.agent({ name: "triage" });
const entity = fixtures.entity({ type: "customer" });
const workflow = fixtures.workflow();
const pipeline = fixtures.pipeline();
```

Every factory accepts an `overrides` object.

### Integration harness (multi-service)

```ts
import { createIntegrationHarness, integrationPage } from "@frontal-labs/testing";
import { EventsSdk } from "@frontal-labs/events";
import { WebhooksSdk } from "@frontal-labs/webhooks";

const harness = createIntegrationHarness([
  { method: "GET", path: "/events/topics", body: integrationPage([{ id: "tpc_1" }]) },
]);

const events = new EventsSdk(harness.createHttp().http);
const webhooks = new WebhooksSdk(harness.createHttp().http);

await events.topics.list();
harness.expectCalled("GET", "/events/topics");
```

### Streams

```ts
import { createTestClient, simulateStream } from "@frontal-labs/testing";

// As a standalone Response…
const res = simulateStream({
  chunks: [{ event: "step", data: { name: "classify" } }, "[DONE]"],
  chunkDelayMs: 5,
});

// …or on a route
const { client } = createTestClient([
  {
    method: "GET",
    path: "/agents/runs/{param}/stream",
    stream: { chunks: [{ event: "completed", data: {} }] },
  },
]);
```

### Model mock

```ts
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";
import { createAIClient } from "@frontal-labs/ai";

const model = mockLanguageModel({ doGenerate: () => ({ text: "Hello" }) });
const ai = createAIClient(createTestClient(model.routes).client);

const { text } = await ai.generateText({ model: "any", prompt: "hi" });
console.log(text, model.calls.length); // "Hello", 1
```

`doStream` scripts `streamText` (text deltas and tool calls); by default it
streams `doGenerate().text` word by word.

### Scenarios

```ts
import { MockFrontal } from "@frontal-labs/testing";

const s = MockFrontal.scenario("happy-path", [
  { on: "agents.message", return: { id: "run_1", status: "running" } },
  { on: "agents.run", return: { id: "run_1", status: "completed" } },
]);
// use s.client, then:
s.assertAllHit();
```

Steps for the same endpoint answer in order. `on` is an alias from
`scenarioAliases` or `"METHOD /path/{param}"`.

### Vitest setup

`@frontal-labs/testing/src/setup.ts` stubs `globalThis.fetch` and sets
`FRONTAL_API_KEY`/`FRONTAL_ENV=test` for you:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { setupFiles: ["@frontal-labs/testing/src/setup.ts"] },
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | No | `frt_test-api-key-...` | Set automatically by `setupTestEnvironment()` |
| `FRONTAL_ENV` | No | `test` | Set automatically by `setupTestEnvironment()` |
