# Testing Guide

This guide covers testing strategies and patterns for the Frontal AI SDK.

## Table of Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mock Testing](#mock-testing)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)

## Unit Testing

### Testing AI Client Methods

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIClient } from '@frontal-labs/ai';

describe('AI Client', () => {
  let ai: ReturnType<typeof createAIClient>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    ai = createAIClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://test.api.frontal.dev'
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Generated text response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await ai.generateText({
        model: 'test-model',
        prompt: 'Test prompt'
      });

      expect(result.text).toBe('Generated text response');
      expect(result.usage.totalTokens).toBe(15);
    });

    it('should throw FrontalError on API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        ai.generateText({ model: 'test-model', prompt: 'Test prompt' })
      ).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  });

  describe('decisions.decide', () => {
    it('should answer questions with typed results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'frontal-labs/decision-4B',
          answers: [{ name: 'billing', type: 'noul', noul: 0.9 }],
          request_id: 'req_1'
        })
      });

      const result = await ai.decisions.decide({
        model: 'frontal-labs/decision-4B',
        state: 'I was charged twice',
        questions: { billing: noul('Is this about billing?') }
      });

      expect(result.answers.billing.noul).toBe(0.9);
      expect(result.requestId).toBe('req_1');
    });
  });
});
```

### Testing Streaming

```typescript
describe('streamText', () => {
  it('should stream text chunks', async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n'
    ];

    const mockStream = new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => {
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        controller.close();
      }
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream
    });

    const result = ai.streamText({
      model: 'test-model',
      prompt: 'Test prompt'
    });

    const chunksReceived: string[] = [];
    for await (const chunk of result.textStream) {
      chunksReceived.push(chunk);
    }

    expect(chunksReceived).toEqual(['Hello', ' world']);
  });
});
```

## Integration Testing

### End-to-End Tests

```typescript
import { describe, it, expect } from 'vitest';
import { ai } from '@frontal-labs/ai';

describe('Integration Tests', () => {
  // These tests require actual API credentials
  // Run with: VITEST_ENV=integration bun test

  it.skip('should call real API', async () => {
    if (process.env.NODE_ENV !== 'integration') {
      return;
    }

    const result = await ai.generateText({
      model: 'frontal-ai-fast',
      prompt: 'Say hello',
      maxTokens: 10
    });

    expect(result.text).toBeTruthy();
  });
});
```

### Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should complete text generation within time limit', async () => {
    const startTime = Date.now();
    
    const result = await ai.generateText({
      model: 'test-model',
      prompt: 'Quick test',
      maxTokens: 50
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(result.text).toBeTruthy();
  });

  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      ai.generateText({
        model: 'test-model',
        prompt: `Test ${i}`,
        maxTokens: 10
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBe(10);
  });
});
```

## Mock Testing

### Mock AI Client

```typescript
export class MockAI {
  private responses = new Map<string, any>();
  private delays = new Map<string, number>();

  setMockResponse(method: string, response: any) {
    this.responses.set(method, response);
  }

  setDelay(method: string, delayMs: number) {
    this.delays.set(method, delayMs);
  }

  async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const delay = this.delays.get('generateText') || 0;
    if (delay > 0) await new Promise(r => setTimeout(r, delay));

    const response = this.responses.get('generateText');
    if (response) return response;

    return {
      text: `Mock response for: ${options.prompt}`,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      toolCalls: [],
      toolResults: [],
      steps: []
    };
  }

  async decide(options: DecideRequest<Questions>) {
    const response = this.responses.get('decide');
    if (response) return response;

    const answers = Object.fromEntries(
      Object.keys(options.questions).map((name) => [name, { type: 'noul', noul: 0.5 }])
    );
    return { answers, model: options.model, requestId: 'req_mock', usage: { inputTokens: 1, outputTokens: 1 } };
  }

  streamText(options: StreamTextOptions): StreamTextResult {
    const response = this.responses.get('streamText');
    if (response) return response;

    const chunks = ['Mock', ' stream', ' response'];
    let index = 0;

    const textStream = new ReadableStream<string>({
      start(controller) {
        const interval = setInterval(() => {
          if (index < chunks.length) {
            controller.enqueue(chunks[index++]);
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 100);
      }
    });

    return {
      textStream,
      usage: Promise.resolve({
        promptTokens: 10,
        completionTokens: 3,
        totalTokens: 13
      })
    };
  }
}
```

### Using Mock in Tests

```typescript
describe('Component with AI', () => {
  let mockAI: MockAI;

  beforeEach(() => {
    mockAI = new MockAI();
  });

  it('should handle AI response', async () => {
    mockAI.setMockResponse('generateText', {
      text: 'Custom mock response',
      finishReason: 'stop',
      usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 }
    });

    const result = await mockAI.generateText({
      model: 'test-model',
      prompt: 'Test'
    });

    expect(result.text).toBe('Custom mock response');
  });
});
```

## Test Utilities

### Test Helpers

```typescript
export class TestUtils {
  /** Returns the value a mocked method should resolve with. */
  static createMockAIResponse<T>(value: T): T {
    return value;
  }

  static createMockStream(chunks: string[]): StreamTextResult {
    const textStream = new ReadableStream<string>({
      start(controller) {
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(chunk);
            if (index === chunks.length - 1) {
              controller.close();
            }
          }, index * 100);
        });
      }
    });

    return {
      textStream,
      usage: Promise.resolve({
        promptTokens: chunks.length * 2,
        completionTokens: chunks.length,
        totalTokens: chunks.length * 3
      })
    };
  }

  static async collectStream(stream: ReadableStream<string>): Promise<string[]> {
    const chunks: string[] = [];
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }

    return chunks;
  }

  static waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Assertion Helpers

```typescript
export class AIAssertions {
  static assertValidTextResult(result: GenerateTextResult) {
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.usage).toBeDefined();
    expect(result.usage.totalTokens).toBeGreaterThanOrEqual(0);
  }

  static assertValidDecisionResult(result: DecisionResult<Questions>) {
    expect(result).toBeDefined();
    expect(result.requestId).toBeTypeOf('string');
    expect(result.answers).toBeTypeOf('object');
  }

  static assertValidStreamResult(result: StreamTextResult) {
    expect(result).toBeDefined();
    expect(result.textStream).toBeInstanceOf(ReadableStream);
    expect(result.usage).toBeInstanceOf(Promise);
  }
}
```

## Best Practices

### 1. Test Structure

```typescript
describe('AI Feature', () => {
  // Arrange
  let ai: ReturnType<typeof createAIClient>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mocks and instances
  });

  describe('Specific Method', () => {
    it('should handle happy path', async () => {
      // Act & Assert
    });

    it('should handle error cases', async () => {
      // Act & Assert
    });

    it('should validate inputs', async () => {
      // Act & Assert
    });
  });
});
```

### 2. Mock Strategy

- **Unit Tests**: Use mocks for all external dependencies
- **Integration Tests**: Use real API with test credentials
- **Performance Tests**: Focus on timing and concurrency

### 3. Environment Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    setupFiles: ['./tests/setup.ts']
  }
});

// tests/setup.ts
import { vi } from 'vitest';

// Global mocks
vi.mock('@frontal-labs/core', () => ({
  FrontalClient: vi.fn()
}));

// Test utilities
global.TestUtils = TestUtils;
global.AIAssertions = AIAssertions;
```

### 4. Test Data Management

```typescript
// tests/fixtures/ai-responses.ts
export const AI_RESPONSES = {
  textGeneration: {
    text: 'Sample response',
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
  },

  decisions: {
    answers: { billing: { type: 'noul', noul: 0.9 } },
    model: 'frontal-labs/decision-4B',
    requestId: 'req_fixture',
    usage: { inputTokens: 5, outputTokens: 1 }
  }

  // For error paths, make the mock reject with a FrontalError instead of
  // returning a fixture. See "Error Handling" below.
};
```

### 5. Error Testing

```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(
      ai.generateText({ model: 'test-model', prompt: 'Test' })
    ).rejects.toThrow('Network error');
  });

  it('should handle validation errors', async () => {
    // Options are validated with Zod before any request is sent
    await expect(
      ai.decisions.decide({ model: 'decision-model', state: Number.NaN, questions: { ok: noul('Is it?') } })
    ).rejects.toThrow();
  });
});
```

### 6. Coverage Goals

- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: Critical path coverage
- **Error Cases**: All error branches tested
- **Edge Cases**: Boundary conditions tested

### 7. Test Performance

```typescript
describe('Performance Benchmarks', () => {
  it('should complete 100 requests within threshold', async () => {
    const startTime = Date.now();
    
    const promises = Array.from({ length: 100 }, () =>
      ai.generateText({
        model: 'test-model',
        prompt: 'Benchmark test',
        maxTokens: 10
      })
    );

    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // Should complete within 30 seconds
    expect(duration).toBeLessThan(30000);
  });
});
```

This testing guide provides comprehensive strategies for ensuring the reliability and performance of the Frontal AI SDK.
