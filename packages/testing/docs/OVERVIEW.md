# @frontal/testing

A lightweight testing utilities package designed specifically for the Frontal Core ecosystem. It provides mock configurations, test environment management, and helper utilities to streamline testing of Frontal Core integrations.

## Features

- **Mock Configuration**: Pre-configured test settings for consistent testing environments
- **Test Environment**: Automated setup and cleanup of test environments
- **Type Safety**: Full TypeScript support with proper type definitions
- **Framework Agnostic**: Works with Vitest, Jest, and other testing frameworks
- **CI/CD Ready**: Optimized for continuous integration environments

## Core Concepts

### Mock Configuration

The package provides a standardized mock configuration for testing:

```typescript
import { createMockConfig } from '@frontal/testing';

const mockConfig = createMockConfig();
// Returns:
// {
//   apiKey: 'test-api-key',
//   baseUrl: 'https://api.test.frontal.dev',
//   timeout: 10000
// }
```

### Test Environment Management

Automated environment setup ensures consistent test conditions:

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from '@frontal/testing';

// Setup test environment
setupTestEnvironment();
// Sets:
// NODE_ENV = 'test'
// CI = 'true'

// Cleanup after tests
cleanupTestEnvironment();
// Removes test-specific environment variables
```

## Usage Patterns

### Basic Test Setup

```typescript
import { 
  createMockConfig, 
  setupTestEnvironment, 
  cleanupTestEnvironment 
} from '@frontal/testing';
import { FrontalClient } from '@frontal/core';

describe('Frontal Integration Tests', () => {
  let client: FrontalClient;
  let mockConfig: MockConfig;

  beforeAll(() => {
    setupTestEnvironment();
    mockConfig = createMockConfig();
    client = new FrontalClient(mockConfig);
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  it('should create client with mock config', () => {
    expect(client.config.apiKey).toBe('test-api-key');
    expect(client.config.baseUrl).toBe('https://api.test.frontal.dev');
  });
});
```

### Framework Integration

#### Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
    globals: true
  }
});

// tests/setup.ts
import { setupTestEnvironment } from '@frontal/testing';

setupTestEnvironment();

// Global test utilities
import { vi } from 'vitest';

vi.mock('@frontal/core', () => ({
  FrontalClient: vi.fn(),
  getDefaultClient: vi.fn()
}));
```

#### Jest Setup

```typescript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node'
};

// tests/setup.js
const { setupTestEnvironment } = require('@frontal/testing');

setupTestEnvironment();

// Mock modules
jest.mock('@frontal/core', () => ({
  FrontalClient: jest.fn(),
  getDefaultClient: jest.fn()
}));
```

### Mock Service Testing

```typescript
import { createMockConfig } from '@frontal/testing';
import { FrontalClient } from '@frontal/core';

class MockFrontalService {
  constructor(private client: FrontalClient) {}

  async getUsers() {
    const response = await this.client._http.get('/users');
    return response.data;
  }

  async createUser(userData: any) {
    const response = await this.client._http.post('/users', userData);
    return response.data;
  }
}

describe('MockFrontalService', () => {
  let service: MockFrontalService;
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      _http: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      }
    };

    service = new MockFrontalService(mockClient);
  });

  it('should get users', async () => {
    const mockUsers = [{ id: 1, name: 'John' }];
    mockClient._http.get.mockResolvedValue({ data: mockUsers });

    const users = await service.getUsers();

    expect(mockClient._http.get).toHaveBeenCalledWith('/users');
    expect(users).toEqual(mockUsers);
  });
});
```

### Integration Testing

```typescript
import { createMockConfig, setupTestEnvironment } from '@frontal/testing';
import { ai } from '@frontal/ai';

describe('AI Integration Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  it('should handle service creation', async () => {
    const mockConfig = createMockConfig();
    
    // Mock the HTTP client
    const mockResponse = {
      data: {
        id: 'test-service-123',
        name: 'test-service',
        status: 'running'
      },
      error: null,
      headers: {}
    };

    vi.spyOn(ai['_http'], 'post').mockResolvedValue(mockResponse.data);

    const result = await ai.generateText({
      memory: 256
    });

    expect(service.data?.id).toBe('test-service-123');
    expect(service.data?.name).toBe('test-service');
  });
});
```

## Configuration Options

### MockConfig Interface

```typescript
interface MockConfig {
  apiKey: string;           // Mock API key for testing
  baseUrl: string;         // Mock base URL
  timeout: number;          // Request timeout in milliseconds
}
```

### Environment Variables

The test environment setup configures these environment variables:

- `NODE_ENV`: Set to 'test'
- `CI`: Set to 'true' for CI/CD detection

## Advanced Patterns

### Custom Mock Configuration

```typescript
import { createMockConfig } from '@frontal/testing';

// Create custom mock config
const customConfig = {
  ...createMockConfig(),
  apiKey: 'custom-test-key',
  baseUrl: 'https://api.custom.test',
  timeout: 5000
};

// Use with any Frontal Core package
const client = new FrontalClient(customConfig);
```

### Test Utilities

```typescript
// tests/utils/test-helpers.ts
import { createMockConfig } from '@frontal/testing';
import { FrontalClient } from '@frontal/core';

export function createTestClient(overrides?: Partial<MockConfig>) {
  const config = {
    ...createMockConfig(),
    ...overrides
  };
  
  return new FrontalClient(config);
}

export function createMockResponse<T>(data: T) {
  return {
    data,
    error: null,
    headers: {}
  };
}

export function createMockErrorResponse(message: string, statusCode: number) {
  return {
    data: null,
    error: {
      message,
      statusCode,
      name: 'test_error'
    },
    headers: null
  };
}
```

### End-to-End Testing

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from '@frontal/testing';
import { ai, blob } from '@frontal/core';

describe('E2E Tests', () => {
  beforeAll(async () => {
    setupTestEnvironment();
    
    // Initialize services with test configuration
    await initializeTestServices();
  });

  afterAll(async () => {
    await cleanupTestServices();
    cleanupTestEnvironment();
  });

  it('should handle complete workflow', async () => {
    // Generate AI content
    const result = await ai.generateText({
      memory: 256
    });

    expect(service.data?.status).toBe('pending');

    // Store data
    const data = await blob.upload('test-file.txt', 'test content');
    expect(data.data?.url).toBeTruthy();

    // Process with AI
    const result = await ai.generateText('Process this data');
    expect(result.data?.text).toBeTruthy();
  });
});
```

## Best Practices

### Test Organization

1. **Use setup files**: Configure test environment in setup files
2. **Mock external dependencies**: Mock HTTP clients and external services
3. **Clean up properly**: Always clean up test environment and resources
4. **Use consistent configs**: Use mock configurations for consistency

### Mock Strategy

1. **Mock at boundaries**: Mock HTTP clients, not internal logic
2. **Use realistic data**: Create mock data that matches real responses
3. **Test error cases**: Include tests for error scenarios
4. **Keep mocks simple**: Avoid over-complicating mock implementations

### Environment Management

1. **Isolate tests**: Ensure tests don't interfere with each other
2. **Use test databases**: Separate test data from production data
3. **Clean up resources**: Remove test artifacts after tests
4. **Use CI detection**: Leverage CI environment variables

## API Reference

### Functions

- `createMockConfig()`: Create standardized mock configuration
- `setupTestEnvironment()`: Set up test environment variables
- `cleanupTestEnvironment()`: Clean up test environment

### Types

- `MockConfig`: Interface for mock configuration

## Integration Examples

### Multi-Package Testing

```typescript
import { createMockConfig } from '@frontal/testing';
import { ai } from '@frontal/ai';
import { blob } from '@frontal/blob';

describe('Multi-Package Integration', () => {
  const mockConfig = createMockConfig();

  it('should work across packages', async () => {
    // All packages use the same underlying client
    const aiClient = new FrontalClient(mockConfig);
    const blobClient = new FrontalClient(mockConfig);

    // Test interactions between packages
    const result = await ai.generateText({
      memory: 1024
    });

    const result = await ai.generateText('Test prompt');
    const file = await blob.upload('output.txt', result.data?.text);

    expect(file.data?.url).toBeTruthy();
  });
});
```

### Performance Testing

```typescript
import { createMockConfig } from '@frontal/testing';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  const mockConfig = createMockConfig();

  it('should handle concurrent requests', async () => {
    const client = new FrontalClient(mockConfig);
    
    const startTime = performance.now();
    
    const promises = Array.from({ length: 100 }, () =>
      client._http.get('/test-endpoint')
    );

    await Promise.all(promises);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });
});
```

## Documentation Structure

- [README.md](./README.md) - Quick start and basic usage
- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Examples](./EXAMPLES.md) - Testing examples and patterns
- [Best Practices](./BEST-PRACTICES.md) - Testing guidelines

## Support

For detailed documentation and examples, see the [Examples](./EXAMPLES.md) and [Best Practices](./BEST-PRACTICES.md). For API details, refer to the [API Reference](./API-REFERENCE.md).
