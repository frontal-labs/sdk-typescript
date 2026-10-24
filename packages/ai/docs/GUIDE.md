# AI Integration Guide

This guide shows how to use the `@frontal-labs/ai` package to build intelligent applications.

## Table of Contents

1. [Authentication](#authentication)
2. [Text Generation](#text-generation)
3. [Structured Output](#structured-output)
4. [Embeddings](#embeddings)
5. [Multimodal (Image, Voice, Video)](#multimodal)
6. [Transcription & Moderation](#transcription--moderation)
7. [Prompt Management](#prompt-management)
8. [Tool Usage](#tool-usage)
9. [Errors](#errors)

## Authentication

The AI client requires a Frontal API key.

```typescript
import { createAIClient } from '@frontal-labs/ai';

const ai = createAIClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

Methods return their results directly. Failures throw (see [Errors](#errors)), so there is no `result.data` or `result.error` to check.

## Text Generation

Use `generateText` for standard LLM interactions.

```typescript
const { text, usage } = await ai.generateText({
  model: 'gpt-4o',
  prompt: 'Explain quantum entanglement simply.',
  temperature: 0.7,
});

console.log(text, usage.totalTokens);
```

### Streaming

For real-time applications:

```typescript
const { textStream } = ai.streamText({
  model: 'gpt-4o',
  prompt: 'Write a haiku.',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

## Structured Output

Generate JSON that follows a Zod schema. The result is validated before it is returned.

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  bio: z.string(),
  age: z.number(),
});

const { object } = await ai.generateObject({
  model: 'gpt-4o',
  prompt: 'Generate a fictional user profile.',
  schema: UserSchema,
  maxRetries: 2,
});

console.log(object); // Typed as { name: string, bio: string, age: number }
```

## Embeddings

`embed` takes one string or an array and returns vectors in input order.

```typescript
const { embeddings, usage } = await ai.embed({
  model: 'text-embedding-3-small',
  input: ['How to reset account password', 'Billing history export'],
});

console.log(embeddings[0].length, usage.totalTokens);
```

There is no default embedding model, so always pass `model`. To reorder search results with a reranker:

```typescript
const { scores } = await ai.rerank({
  model: reranker, // from ai.getDefaultModels()
  query: 'reset password',
  documents: ['Account settings', 'Password reset steps'],
  topK: 1,
});
```

## Multimodal

### Image Generation
```typescript
const { images } = await ai.generateImage({
  prompt: "A cyberpunk city at night",
  model: "dall-e-3",
  size: "1024x1024"
});
console.log(images[0].url);
```

### Speech Generation (TTS)
```typescript
const audio = await ai.generateSpeech({
  text: "Hello from Frontal AI",
  voice: "alloy"
});
// audio is an ArrayBuffer
```

## Transcription & Moderation

### Audio Transcription
```typescript
const { text } = await ai.transcribe({
  file: myAudioFile, // File or Blob
  model: "whisper-1"
});
console.log(text);
```

### Content Moderation
Check if text violates safety policies.
```typescript
const { results } = await ai.moderate({ input: "Some user content" });
if (results[0].flagged) {
  console.warn("Content flagged!");
}
```

## Prompt Management

Prompt templates are kept in client memory. They are not stored on the server.

```typescript
// Create
ai.createPrompt({
  name: "welcome-email",
  template: "Welcome {{name}} to our platform!",
  variables: { name: { type: "string" } }
});

// Use. Throws if the name is unknown.
const template = ai.getPrompt("welcome-email");
// Combine with generateText...
```

## Tool Usage

Define tools with `tool()` and pass them to `generateText`. With `maxSteps` greater than 1, the SDK runs the tools and asks the model again with the results.

```typescript
import { tool } from "@frontal-labs/ai";
import { z } from "zod";

const { text } = await ai.generateText({
  model: 'gpt-4o',
  prompt: 'What is 10 + 5?',
  tools: {
    add: tool({
      description: 'Adds two numbers',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      execute: async ({ a, b }) => a + b,
    }),
  },
  maxSteps: 3,
});
```

Tools without `execute` are not run. Their calls come back in `toolCalls` so your code can run them.

## Errors

Every method throws on failure:

- `FrontalError` (from `@frontal-labs/core`) for API errors. Check `retryable` to decide whether to retry, and show `fix` when it is set.
- `ZodError` for invalid options. These are thrown before any request is sent.

```typescript
import { FrontalError } from "@frontal-labs/core";

try {
  await ai.generateText({ model: 'gpt-4o', prompt: 'Hi' });
} catch (err) {
  if (err instanceof FrontalError) {
    console.error(err.statusCode, err.code, err.fix ?? '');
  } else {
    throw err;
  }
}
```
