# Examples

This page contains practical examples and tutorials for using the Frontal AI SDK.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Text Generation](#text-generation)
- [Streaming](#streaming)
- [Structured Decisions](#structured-decisions)
- [Structured Output](#structured-output)
- [Advanced Patterns](#advanced-patterns)

## Basic Usage

### Simple Text Generation

```typescript
import { ai } from '@frontal-labs/ai';

const response = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: 'What is artificial intelligence?',
  maxTokens: 100,
  temperature: 0.7
});

console.log(response.text);
```

### Using a Custom Client

```typescript
import { createAIClient } from '@frontal-labs/ai';

const ai = createAIClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://ai.frontal.dev'
});

const result = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: 'Explain quantum computing',
  maxTokens: 200
});
```

## Text Generation

### Conversation Handling

```typescript
import { ai, type Message } from '@frontal-labs/ai';

const messages: Message[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: 'The capital of France is Paris.' },
  { role: 'user', content: 'What is its population?' }
];

const response = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: '', // required by the type; ignored because messages is set
  messages,
  maxTokens: 50
});
```

### Temperature Control

```typescript
// Creative writing (high temperature)
const creative = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: 'Write a short story about time travel',
  temperature: 0.9,
  maxTokens: 300
});

// Factual responses (low temperature)
const factual = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: 'What are the primary colors?',
  temperature: 0.1,
  maxTokens: 100
});
```

### Token Management

```typescript
import { ai } from '@frontal-labs/ai';

// Estimate tokens before generation
const prompt = 'Your long prompt here...';
const estimatedTokens = ai.countTokens(prompt);
console.log(`Estimated tokens: ${estimatedTokens}`);

// Generate with token limit
const result = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt,
  maxTokens: Math.min(estimatedTokens, 4000)
});

// Check actual usage
console.log(`Actual usage: ${result.usage.totalTokens}`);
```

## Streaming

### Basic Streaming

```typescript
import { ai } from '@frontal-labs/ai';

const stream = ai.streamText({
  model: 'frontal-ai-fast',
  prompt: 'Tell me a story',
  onChunk: (chunk) => {
    console.log('Received chunk:', chunk);
  }
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const usage = await stream.usage;
console.log(`\nTotal tokens: ${usage.totalTokens}`);
```

### Streaming with UI Updates

```typescript
import { ai } from '@frontal-labs/ai';

class ChatUI {
  private outputElement: HTMLElement;
  private currentContent = '';

  constructor(outputElement: HTMLElement) {
    this.outputElement = outputElement;
  }

  async streamResponse(prompt: string) {
    const stream = ai.streamText({
      model: 'frontal-ai-fast',
      prompt,
      onChunk: (chunk) => {
        this.appendChunk(chunk);
      }
    });

    for await (const chunk of stream.textStream) {
      this.appendChunk(chunk);
    }
  }

  private appendChunk(chunk: string) {
    this.currentContent += chunk;
    this.outputElement.textContent = this.currentContent;
  }
}
```

### Streaming with Error Handling

```typescript
import { ai } from '@frontal-labs/ai';

async function safeStream(prompt: string) {
  try {
    const stream = ai.streamText({
      model: 'frontal-ai-fast',
      prompt
    });

    const chunks: string[] = [];
    
    for await (const chunk of stream.textStream) {
      chunks.push(chunk);
      console.log(chunk);
    }

    const usage = await stream.usage;
    console.log(`Completed. Tokens used: ${usage.totalTokens}`);
    
    return chunks.join('');
  } catch (error) {
    console.error('Streaming failed:', error);
    throw error;
  }
}
```

## Structured Decisions

### Triage a support ticket

```ts
import { choice, noul, score } from '@frontal-labs/ai';

async function triage(ticket: string) {
  const { answers, requestId } = await ai.decisions.decide({
    model: 'frontal-labs/decision-4B',
    state: { ticket },
    questions: {
      billing: noul('Is this about billing?'),
      category: choice('What is this ticket about?', { billing: null, technical: null, other: null }),
      severity: score('How severe is it?', ['low', 'medium', 'high']),
    },
  });
  // Route on the typed answers; keep requestId for the audit trail.
  return { category: answers.category.choice, severity: answers.severity.level, requestId };
}
```

### Gate a hard-to-reverse action

```ts
const { answers } = await ai.decisions.decide({
  model: 'frontal-labs/decision-4B',
  state: { refundRequest: 'Refund the full order, order 1042.' },
  questions: { authorized: noul('Is the requester authorized to refund this order?') },
});

// Confidence is not proof: a person approves the refund before it runs.
if (answers.authorized.noul > 0.9) {
  await requestHumanApproval('refund-1042');
}
```

### Model list

```ts
const models = await ai.decisions.models();
console.log(models.map((m) => m.name));
```

## Structured Output

### JSON Generation with Zod

```typescript
import { z } from 'zod';
import { ai } from '@frontal-labs/ai';

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
  hobbies: z.array(z.string())
});

const result = await ai.generateObject({
  model: 'frontal-ai-fast',
  prompt: 'Create a profile for a software developer named John',
  schema: personSchema,
  temperature: 0.3
});

console.log('Generated person:', result.object);
// Type-safe access
console.log('Name:', result.object.name);
console.log('Hobbies:', result.object.hobbies.join(', '));
```

### Complex Object Generation

```typescript
const productSchema = z.object({
  name: z.string(),
  price: z.number(),
  category: z.enum(['electronics', 'clothing', 'books', 'home']),
  features: z.array(z.string()),
  specifications: z.object({
    weight: z.number().optional(),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
      depth: z.number()
    }).optional()
  })
});

const result = await ai.generateObject({
  model: 'frontal-ai-fast',
  prompt: 'Describe a high-end laptop for professionals',
  schema: productSchema,
  maxRetries: 3
});
```

### Retry Logic

```typescript
async function generateWithRetry<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await ai.generateObject({
        model: 'frontal-ai-fast',
        prompt,
        schema,
        temperature: 0.1,
        maxRetries: 0 // We handle retries manually
      });

      return result.object;
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error('All retry attempts failed');
}
```

## Advanced Patterns

### Tool System

```typescript
import { ai, tool } from '@frontal-labs/ai';
import { z } from 'zod';

// Define a tool. Keys in the ToolSet are the names the model sees.
const tools = {
  get_weather: tool({
    description: 'Get current weather for a location',
    inputSchema: z.object({
      location: z.string(),
      units: z.enum(['celsius', 'fahrenheit']).default('celsius')
    }),
    execute: async ({ location, units }) => {
      // Call weather API
      const response = await fetch(
        `https://api.weather.com/weather?q=${location}&units=${units}`
      );
      return response.json();
    }
  })
};

// Let the SDK run tools and feed results back to the model (up to 3 calls)
const { text } = await ai.generateText({
  model: 'gpt-4o-mini',
  prompt: 'What is the weather like in New York?',
  tools,
  maxSteps: 3
});

console.log(text);
```

### Prompt Management

```typescript
import { ai } from '@frontal-labs/ai';

// Create a prompt template
const storyPrompt = ai.createPrompt({
  name: 'story-generator',
  template: 'Write a {genre} story about {topic} that is approximately {length} words long.',
  variables: {
    genre: {
      type: 'string',
      description: 'The genre of the story'
    },
    topic: {
      type: 'string',
      description: 'The main topic of the story'
    },
    length: {
      type: 'number',
      description: 'Target word count'
    }
  }
});

// Use the prompt
const filledPrompt = storyPrompt.template
  .replace('{genre}', 'science fiction')
  .replace('{topic}', 'time travel')
  .replace('{length}', '500');

const result = await ai.generateText({
  model: 'frontal-ai-fast',
  prompt: filledPrompt
});
```

### Error Handling & Retry Logic

```typescript
class RobustAIClient {
  constructor(private ai: AISdk) {}

  async generateWithRetry(
    options: GenerateTextOptions,
    maxRetries: number = 3
  ): Promise<GenerateTextResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.ai.generateText(options);
      } catch (error) {
        lastError = error as Error;
        // Retry only on errors the gateway marks as retryable
        const retryable = error instanceof FrontalError ? error.retryable : false;
        if (!retryable) throw error;
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Cost Tracking

```typescript
class CostTracker {
  private totalCost = 0;
  private requestCount = 0;

  async trackGeneration(options: GenerateTextOptions): Promise<string> {
    const result = await ai.generateText(options);
    
    const cost = ai.estimateCost({
      model: options.model,
      inputTokens: result.usage.promptTokens,
      outputTokens: result.usage.completionTokens
    });

    this.totalCost += cost;
    this.requestCount++;

    console.log(`Request ${this.requestCount}: $${cost.toFixed(6)}`);
    console.log(`Total cost: $${this.totalCost.toFixed(6)}`);

    return result.text;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getAverageCost(): number {
    return this.requestCount > 0 ? this.totalCost / this.requestCount : 0;
  }
}
```

### Batch Processing

```typescript
async function processBatch(
  prompts: string[],
  options: Partial<GenerateTextOptions> = {},
  concurrency: number = 5
): Promise<string[]> {
  const results: string[] = [];
  const semaphore = new Semaphore(concurrency);

  const promises = prompts.map(async (prompt, index) => {
    await semaphore.acquire();
    
    try {
      const result = await ai.generateText({
        model: 'frontal-ai-fast',
        prompt,
        maxTokens: 100,
        ...options
      });

      results[index] = result.text;
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(promises);
  return results;
}

class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next();
      this.permits--;
    }
  }
}
```

These examples demonstrate practical implementations of common AI workflows using the Frontal AI SDK.
