# Examples

This page contains practical examples and tutorials for using the Frontal AI SDK.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Text Generation](#text-generation)
- [Streaming](#streaming)
- [Embeddings](#embeddings)
- [Structured Output](#structured-output)
- [Multimodal](#multimodal)
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

## Embeddings

### Single Text Embedding

```typescript
import { ai } from '@frontal-labs/ai';

const result = await ai.embed({
  model: 'text-embedding-3-small',
  input: 'Hello, world!'
});

console.log('Embedding:', result.embeddings[0]);
console.log('Tokens used:', result.usage.totalTokens);
```

### Batch Embeddings

```typescript
const texts = [
  'The cat sat on the mat',
  'The dog chased the ball',
  'Birds fly in the sky'
];

const result = await ai.embed({
  model: 'text-embedding-3-small',
  input: texts
});

result.embeddings.forEach((embedding, index) => {
  console.log(`Text ${index + 1}:`, embedding.slice(0, 5)); // Show first 5 values
});
```

### Semantic Search

```typescript
class SemanticSearch {
  private documents: Array<{ text: string; embedding: number[] }> = [];

  async addDocument(text: string) {
    const { embeddings } = await ai.embed({
      model: 'text-embedding-3-small',
      input: text
    });

    this.documents.push({ text, embedding: embeddings[0] });
  }

  async search(query: string, topK: number = 3) {
    const { embeddings } = await ai.embed({
      model: 'text-embedding-3-small',
      input: query
    });

    const queryEmbedding = embeddings[0];
    const similarities = this.documents.map(doc => ({
      text: doc.text,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
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

## Multimodal

### Speech Synthesis

```typescript
import { ai } from '@frontal-labs/ai';

const audioBuffer = await ai.generateSpeech({
  text: 'Hello, this is a test of the speech synthesis system.',
  voice: 'alloy',
  model: 'tts-1',
  speed: 1.0,
  format: 'mp3'
});

// Save to file or play in browser
const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
const url = URL.createObjectURL(blob);

// Play in browser
const audio = new Audio(url);
audio.play();
```

### Image Generation

```typescript
const imageResult = await ai.generateImage({
  prompt: 'A serene mountain landscape at sunset, digital art style',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd',
  style: 'natural',
  n: 2
});

imageResult.images.forEach((image, index) => {
    if (image.url) {
      console.log(`Image ${index + 1}: ${image.url}`);
    } else if (image.b64Json) {
      // Convert base64 to blob
      const blob = new Blob([
        Buffer.from(image.b64Json, 'base64')
      ], { type: 'image/png' });
      console.log(`Image ${index + 1} created as blob`);
    }
});
```

### Audio Transcription

```typescript
import { ai } from '@frontal-labs/ai';

// Transcribe from file
const fileInput = document.getElementById('audio-file') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const transcription = await ai.transcribe({
    file,
    model: 'whisper-1',
    language: 'en',
    responseFormat: 'json'
  });

  console.log('Transcription:', transcription.text);
}
```

### Content Moderation

```typescript
async function moderateContent(text: string): Promise<boolean> {
  const result = await ai.moderate({
    input: text,
    model: 'text-moderation-latest'
  });

  const flagged = result.results[0]?.flagged || false;
  if (flagged) {
    console.log('Content flagged:', result.results[0]?.categories);
  }
  return flagged;
}

// Usage
const isFlagged = await moderateContent('This is some potentially harmful content');
if (isFlagged) {
  console.log('Content was flagged for moderation');
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
