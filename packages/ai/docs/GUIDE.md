# AI Integration Guide

This guide provides in-depth information on using the `@frontal-labs/ai` package to build intelligent applications.

## Table of Contents

1. [Authentication](#authentication)
2. [Text Generation](#text-generation)
3. [Structured Output](#structured-output)
4. [Multimodal (Image, Voice, Video)](#multimodal)
5. [Transcription & Moderation](#transcription--moderation)
6. [Prompt Management](#prompt-management)
7. [Tool Usage](#tool-usage)

## Authentication

The AI client requires a Frontal API Key.

```typescript
import { AI } from '@frontal-labs/ai';

const ai = new AI({ apiKey: process.env.FRONTAL_API_KEY });
```

## Text Generation

Use `generateText` for standard LLM interactions.

```typescript
const result = await ai.generateText({
  model: 'gpt-4o',
  prompt: 'Explain quantum entanglement simply.',
  temperature: 0.7,
});

if (result.data) {
  console.log(result.data.text);
}
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

Generate JSON that strictly follows a Zod schema.

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  bio: z.string(),
  age: z.number(),
});

const result = await ai.generateObject({
  model: 'gpt-4o',
  prompt: 'Generate a fictional user profile.',
  schema: UserSchema,
});

console.log(result.data?.object); // Typed as { name: string, bio: string, age: number }
```

## Multimodal

### Image Generation
```typescript
const image = await ai.generateImage({
  prompt: "A cyberpunk city at night",
  model: "dall-e-3",
  size: "1024x1024"
});
console.log(image.data?.images[0].url);
```

### Speech Generation (TTS)
```typescript
const speech = await ai.generateSpeech({
  text: "Hello from Frontal AI",
  voice: "alloy"
});
// result.data is an ArrayBuffer
```

## Transcription & Moderation

### Audio Transcription
```typescript
const transcript = await ai.transcribe({
  file: myAudioFile, // File or Blob
  model: "whisper-1"
});
console.log(transcript.data?.text);
```

### Content Moderation
Check if text violates safety policies.
```typescript
const mod = await ai.moderate({ input: "Some user content" });
if (mod.data?.results[0].flagged) {
  console.warn("Content flagged!");
}
```

## Prompt Management

Manage templates centrally.

```typescript
// Create
ai.createPrompt({
  name: "welcome-email",
  template: "Welcome {{name}} to our platform!",
  variables: { name: { type: "string" } }
});

// Use (check response.error)
const response = ai.getPrompt("welcome-email");
if (response.error) throw new Error(response.error.message);
const template = response.data;
// Combine with generateText...
```

## Tool Usage

Define and execute tools.

```typescript
const calcTool = ai.defineTool({
  name: "add",
  description: "Adds two numbers",
  parameters: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b
});

ai.registerTool(calcTool);

const result = await ai.executeTool("add", { a: 10, b: 5 });
// Check result.error; result.data contains the return value
```
