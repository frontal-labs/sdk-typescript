# Frontal Testing SDK

A lightweight testing utilities package for the Frontal Core ecosystem. Provides mock configurations, test environment setup, and utilities for testing Frontal Core integrations.

## Features

- **Mock Configuration**: Pre-configured mock settings for testing
- **Test Environment**: Automated test environment setup and cleanup
- **Utilities**: Helper functions for common testing scenarios
- **Type Safety**: Full TypeScript support for test configurations

## Installation

```bash
bun add @frontal-labs/testing
```

## Quick Start

```typescript
import { 
  createMockConfig, 
  setupTestEnvironment, 
  cleanupTestEnvironment 
} from '@frontal-labs/testing';

// Set up test environment
setupTestEnvironment();

// Create mock configuration
const mockConfig = createMockConfig();
console.log(mockConfig.apiKey); // 'test-api-key'
console.log(mockConfig.baseUrl); // 'https://api.test.frontal.dev'

// Clean up after tests
cleanupTestEnvironment();
```

## Usage

### Test Environment Setup

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from '@frontal-labs/testing';

describe('My Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  it('should work in test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.CI).toBe('true');
  });
});
```

### Mock Configuration

```typescript
import { createMockConfig } from '@frontal-labs/testing';

const mockConfig = createMockConfig();

// Use with FrontalClient
import { FrontalClient } from '@frontal-labs/core';

const testClient = new FrontalClient({
  apiKey: mockConfig.apiKey,
  baseUrl: mockConfig.baseUrl,
  environment: 'test'
});
```

### Integration with Test Frameworks

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { setupTestEnvironment } from '@frontal-labs/testing';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'node'
  }
});

// tests/setup.ts
import { setupTestEnvironment } from '@frontal-labs/testing';

setupTestEnvironment();
```

## Documentation

- [Overview](./OVERVIEW.md) - Complete package overview
- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Examples](./EXAMPLES.md) - Testing examples and patterns
- [Best Practices](./BEST-PRACTICES.md) - Testing guidelines
