# Testing Guide

This guide covers testing strategies, tools, and best practices for the Frontal
SDK monorepo.

## Testing Stack

We use a modern testing stack to ensure code quality and reliability:

- **Bun Test** - Fast test runner built into Bun, compatible with Vitest APIs
- **Vitest** - Test utilities (`describe`, `it`, `expect`, `vi`, `mock`, etc.)
- **@frontal-labs/testing** - Shared mock clients, fixtures, and test harness
- **Biome** - Linting and formatting for consistent code style

## Test Structure

### Directory Layout

```text
packages/
├── ai/
│   ├── src/
│   ├── tests/
│   │   ├── ai.test.ts
│   │   └── ...
│   └── package.json
└── ...
```

### Test Types

1. **Unit Tests** - Test individual functions and service methods in isolation,
   using mock fetch from `@frontal-labs/testing`
2. **Integration Tests** - Test interactions with a mocked HTTP transport layer
3. **Live Compatibility Tests** - Smoke tests against live Frontal API backends
   (`bun run test:live`)

## Running Tests

### Basic Commands

```bash
# Run all tests at the root level (vitest)
bun run test

# Run tests for a specific package
cd packages/ai
bun test

# Run live backend compatibility checks
bun run test:live
```

## Writing Tests

### Test File Naming

- Tests: `*.test.ts` at the package level

### Test Structure Example

```typescript
import { describe, expect, it } from "vitest";
import { AISdk } from "@frontal-labs/ai";
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";

describe("AISdk", () => {
  it("sends a chat completion request", async () => {
    const model = mockLanguageModel({ doGenerate: () => ({ text: "Hello from AI" }) });
    const { client, mock } = createTestClient(model.routes);
    const ai = new AISdk(client.httpClient);

    const result = await ai.generateText({
      model: "claude-sonnet-4-6",
      prompt: "Hello",
    });

    expect(result.text).toBe("Hello from AI");
    mock.expectCalled("POST", "/ai/chat/completions");
  });
});
```

## Best Practices

### 1. Test Organization

- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Arrange-Act-Assert pattern for test structure

### 2. Mocking and Fixtures

`@frontal-labs/testing` mocks at three levels. All of them run the *real* SDK
code (retries, snake/camel transforms, typed errors) — only `fetch` is faked.

#### Recipe A — fetch mock (any endpoint)

```ts
import { Frontal } from "@frontal-labs/sdk";
import { createTestClient, mockPageResponse } from "@frontal-labs/testing";

const { client, mock } = createTestClient([
  { method: "GET", path: "/agents", body: mockPageResponse([{ id: "agt_1" }]) },
  // `{param}` wildcards use the same vocabulary as contracts/sdk-endpoints.json
  { method: "GET", path: "/agents/{param}", status: 404, body: { code: "NOT_FOUND", message: "nope" } },
  // Serve SSE for streaming endpoints
  { method: "GET", path: "/agents/runs/{param}/stream", stream: { chunks: [{ event: "completed", data: {} }] } },
]);

const f = new Frontal(client);
await f.agents.list({ limit: 1 });
mock.expectCalled("GET", "/agents");
```

Routes also accept `handler(request)` for dynamic responses and `times` to
answer only N calls (so several routes for one path answer in order).

#### Recipe B — model mock (AI without a gateway)

`mockLanguageModel` scripts what the model says; the SDK's request building
and response parsing still run end to end.

```ts
import { Frontal } from "@frontal-labs/sdk";
import { tool } from "@frontal-labs/ai";
import { createTestClient, mockLanguageModel } from "@frontal-labs/testing";
import { z } from "zod";

const model = mockLanguageModel({
  doGenerate: (call) => ({
    text: `You said: ${call.messages.at(-1)?.content}`,
    toolCalls: [{ toolName: "classify", input: { text: "hi" } }],
  }),
  doStream: () => ["Hel", "lo", { toolCall: { toolName: "classify", input: { text: "hi" } } }],
});

const f = new Frontal(createTestClient(model.routes).client);

const result = await f.ai.generateText({
  model: "claude-sonnet-5",
  prompt: "hi",
  tools: { classify: tool({ description: "c", inputSchema: z.object({ text: z.string() }) }) },
});
console.log(result.text, result.toolCalls);        // parsed by the real SDK
console.log(model.calls[0]?.tools?.[0]?.function); // what the SDK sent
```

#### Recipe C — scenario (multi-step, sequenced)

```ts
import { Frontal } from "@frontal-labs/sdk";
import { MockFrontal } from "@frontal-labs/testing";

const s = MockFrontal.scenario("refund-approved", [
  { on: "agents.message", return: { id: "run_1", status: "running" } },
  { on: "agents.run", return: { id: "run_1", status: "running" } },
  { on: "agents.run", return: { id: "run_1", status: "completed" } },
  { on: "agents.watch", stream: { chunks: [{ event: "state", data: { tier: "enterprise" } }] } },
  { on: "workflows.approvals.approve", return: { id: "apr_1", status: "approved" } },
]);

const f = new Frontal(s.client);
const agent = f.agents.use("agt_1");
const run = await agent.message("support.ticket.created", { ticketId: "t_1" });
await agent.waitForCompletion(run.id, { interval: 1 });
for await (const part of agent.watch(run.id)) {
  if (part.type === "event" && part.event === "state") {
    await f.workflows.approvals.approve("apr_1", "LGTM");
  }
}
s.assertAllHit(); // throws listing any step that was never reached
```

`on` accepts an alias (`agents.message`, `ai.generateText`, … see
`scenarioAliases`) or an explicit `"METHOD /path/{param}"`.

#### Streams in isolation

`simulateStream({ chunks, chunkDelayMs, done })` returns a `Response` you can
hand to any mock `fetch` — useful for UI tests that consume `fullStream`.

### 3. Async Testing

```typescript skip
// TODO(example): illustrative pseudo-code with placeholder names; not compiled.
it("should handle async operations", async () => {
  const result = await service.query();
  expect(result).toBeDefined();
});
```

### 4. Error Handling

```typescript skip
// TODO(example): illustrative pseudo-code with placeholder names; not compiled.
it("should throw appropriate errors", () => {
  expect(() => invalidOperation()).toThrow("Expected error message");
});
```

## Coverage Requirements

We maintain high code quality with comprehensive coverage:

- **Target Coverage**: 90%+ for all packages
- **Critical Paths**: 100% coverage required
- **New Features**: Must include tests before merging

### Running with Coverage

```bash
# Coverage in a package
cd packages/<name>
bun test --coverage
```

## Integration Testing

### External Service Testing

For packages that interact with external services, use the test HTTP client
from `@frontal-labs/testing` instead of making real network calls:

```typescript skip
// TODO(example): illustrative pseudo-code with placeholder names; not compiled.
import { createTestHttpClient } from "@frontal-labs/testing";

describe("Service", () => {
  it("should call the API", async () => {
    const { http } = createTestHttpClient([
      { method: "GET", path: "/v1/items/1", body: { id: "1", name: "Test" } },
    ]);
    const service = new MyService(http);

    const result = await service.get("1");

    expect(result.name).toBe("Test");
  });
});
```

### Environment Configuration

Use environment variables for integration tests:

```bash
# .env.test
FRONTAL_API_KEY=test_key
TEST_ENDPOINT=https://api.test.com
```

## Continuous Integration

### GitHub Actions

Our CI pipeline runs tests automatically:

- **Unit Tests** on every push and PR
- **Format and Lint checks** on every push and PR
- **Build and Type Check** on every push to main branches

### Test Environment

We test across:

- **Runtime**: Node.js (v18, v20, v22), Bun (latest)
- **OS**: Ubuntu, macOS

## Debugging Tests

Enable verbose output for debugging:

```bash
bun test --reporter=verbose
```

## Test Data Management

### Fixtures

Use `@frontal-labs/testing` for shared fixtures:

```typescript
import { fixtures, createTestHttpClient } from "@frontal-labs/testing";

// Pre-built fixtures for entity types
const agent = fixtures.agent({ name: "test-agent" });
const workflow = fixtures.workflow({ name: "test-workflow" });

// Custom test HTTP client
const { http } = createTestHttpClient([
  { method: "GET", path: "/v1/data", body: { data: "response" } },
]);
```

## Common Pitfalls

### 1. Test Isolation

Ensure tests don't depend on each other:

```typescript
beforeEach(() => {
  // Reset state before each test
});
```

### 2. Async Cleanup

Clean up resources properly:

```typescript skip
// TODO(example): illustrative pseudo-code with placeholder names; not compiled.
afterEach(async () => {
  await cleanupResources();
});
```

### 3. Time-Based Tests

Use fake timers for time-dependent tests:

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Bun Testing](https://bun.sh/docs/test)
- [Testing Best Practices][tbp]

[tbp]: https://github.com/goldbergyoni/javascript-testing-best-practices

## Contributing

When contributing:

1. Write tests for new features
2. Maintain existing test coverage
3. Update documentation for test changes
4. Ensure all tests pass before submitting PRs
