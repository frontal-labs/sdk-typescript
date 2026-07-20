# Testing Guide

This guide covers testing strategies, tools, and best practices for the Frontal
SDK monorepo.

## Testing Stack

We use a modern testing stack to ensure code quality and reliability:

- **Bun Test** - Fast test runner built into Bun, compatible with Vitest APIs
- **Vitest** - Test utilities (`describe`, `it`, `expect`, `vi`, `mock`, etc.)
- **@frontal-labs/_testing** - Shared mock clients, fixtures, and test harness
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
   using mock fetch from `@frontal-labs/_testing`
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
import { describe, it, expect } from "vitest";
import { createTestHttpClient } from "@frontal-labs/_testing";
import { AIService } from "../src";

describe("AIService", () => {
  it("should send a generate text request", async () => {
    const { http } = createTestHttpClient([
      { method: "POST", path: "/v1/generate", body: { text: "Hello from AI" } },
    ]);
    const service = new AIService(http);

    const result = await service.generateText({
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.text).toBe("Hello from AI");
  });
});
```

## Best Practices

### 1. Test Organization

- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Arrange-Act-Assert pattern for test structure

### 2. Mocking and Fixtures

Use `@frontal-labs/_testing` for mock HTTP transport and fixtures:

```typescript
import { createTestHttpClient, createMockFetch } from "@frontal-labs/_testing";

// Create a test HTTP client that returns canned responses
const { http, mock } = createTestHttpClient([
  { method: "GET", path: "/v1/data", body: { data: "test response" } },
]);

// Or use mock fetch with route matching
const mockFetch = createMockFetch([
  { method: "GET", path: "/api/items", body: { items: [] } },
]);
```

### 3. Async Testing

```typescript
it("should handle async operations", async () => {
  const result = await service.query();
  expect(result).toBeDefined();
});
```

### 4. Error Handling

```typescript
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
from `@frontal-labs/_testing` instead of making real network calls:

```typescript
import { createTestHttpClient } from "@frontal-labs/_testing";

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

Use `@frontal-labs/_testing` for shared fixtures:

```typescript
import { fixtures, createTestHttpClient } from "@frontal-labs/_testing";

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

```typescript
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
