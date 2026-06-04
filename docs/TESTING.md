# Testing Guide

This guide covers testing strategies, tools, and best practices for the Frontal SDK monorepo.

## Testing Stack

We use a modern testing stack to ensure code quality and reliability:

- **Vitest** - Fast unit test runner with TypeScript support
- **Bun Test** - Built-in test runner for performance-critical tests
- **Coverage** - Built-in coverage reporting with Vitest
- **Biome** - Linting and formatting for consistent code style

## Test Structure

### Directory Layout

```text
packages/
├── ai/
│   ├── src/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   └── package.json
└── ...
```

### Test Types

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test package interactions and external dependencies
3. **E2E Tests** - Test complete workflows across multiple packages

## Running Tests

### Basic Commands

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage

# Run tests for specific package
bun test packages/ai
```

### Package-Specific Testing

Each package can be tested individually:

```bash
# Test specific package
cd packages/ai
bun test

# Test with coverage
bun test --coverage
```

## Writing Tests

### Test File Naming

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- Fixtures: `fixtures/` directory

### Test Structure Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AI } from '../src';

describe('AI Package', () => {
  let ai: AI;

  beforeEach(() => {
    ai = new AI({ apiKey: 'test-key' });
  });

  it('should initialize with correct config', () => {
    expect(ai).toBeDefined();
    expect(ai.config.apiKey).toBe('test-key');
  });

  it('should handle inference requests', async () => {
    const response = await ai.inference('test prompt');
    expect(response).toBeDefined();
  });
});
```

## Best Practices

### 1. Test Organization

- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Arrange-Act-Assert pattern for test structure

### 2. Mocking and Fixtures

```typescript
import { vi } from 'vitest';

// Mock external dependencies
vi.mock('@frontal-labs/core', () => ({
  HttpClient: vi.fn(),
}));

// Use fixtures for test data
const testConfig = {
  apiKey: 'test-key',
  endpoint: 'https://api.test.com',
};
```

### 3. Async Testing

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).resolves.toBeDefined();
});
```

### 4. Error Handling

```typescript
it('should throw appropriate errors', () => {
  expect(() => invalidOperation()).toThrow('Expected error message');
});
```

## Coverage Requirements

We maintain high code quality with comprehensive coverage:

- **Target Coverage**: 90%+ for all packages
- **Critical Paths**: 100% coverage required
- **New Features**: Must include tests before merging

### Coverage Reports

```bash
# Generate detailed coverage report
bun run test:coverage

# View coverage in browser
open coverage/index.html
```

## Integration Testing

### External Service Testing

For packages that interact with external services:

```typescript
import { beforeAll, afterAll } from 'vitest';

describe('External API Integration', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  it('should communicate with real API', async () => {
    // Integration test with actual service
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
- **Integration Tests** on PR to main
- **Coverage Checks** enforce minimum coverage
- **Performance Tests** for critical packages

### Test Matrix

We test across multiple environments:

- **Node.js**: v18, v20, v22
- **Bun**: Latest stable
- **OS**: Ubuntu, macOS, Windows

## Performance Testing

For performance-critical packages:

```typescript
import { bench } from 'vitest';

bench('performance test', () => {
  // Performance measurement
}, { time: 1000 });
```

## Debugging Tests

### VS Code Integration

Use VS Code's testing extension for better debugging:

```json
// .vscode/settings.json
{
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

### Console Output

Enable verbose output for debugging:

```bash
bun test --reporter=verbose
```

## Test Data Management

### Fixtures

Store test data in organized fixtures:

```typescript
// fixtures/ai-responses.ts
export const mockInferenceResponse = {
  id: 'test-id',
  response: 'Test response',
  timestamp: new Date().toISOString(),
};
```

### Test Utilities

Create reusable test utilities:

```typescript
// tests/utils/test-helpers.ts
export function createMockClient(overrides = {}) {
  return {
    apiKey: 'test-key',
    endpoint: 'https://test.com',
    ...overrides,
  };
}
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
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Contributing

When contributing:

1. Write tests for new features
2. Maintain existing test coverage
3. Update documentation for test changes
4. Ensure all tests pass before submitting PRs
