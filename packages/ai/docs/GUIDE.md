# AI Integration Guide

This guide shows how to use the `@frontal-labs/ai` package to build intelligent applications.

## Table of Contents

1. [Authentication](#authentication)
2. [Text Generation](#text-generation)
3. [Structured Output](#structured-output)
4. [Structured Decisions](#structured-decisions)
5. [Prompt Management](#prompt-management)
6. [Tool Usage](#tool-usage)
7. [Errors](#errors)

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

## Structured Decisions

Ask typed questions about a state and get typed answers. Use `noul` for yes/no, `choice` for one label from a set, and `score` for an ordered rubric. Ask one narrow question per entry and combine the answers in code, rather than one broad question.

```ts
import { choice, noul, score } from '@frontal-labs/ai';

const decision = await ai.decisions.decide({
  model: 'frontal-labs/decision-4B',
  state: { ticket: 'I was charged twice. Please fix this ASAP.' },
  questions: {
    billing: noul('Is this about billing?'),
    category: choice('What is this ticket about?', { billing: null, technical: null, other: null }),
    severity: score('How severe is it?', ['low', 'medium', 'high']),
  },
});

decision.answers.billing.noul;        // probability in [0, 1]
decision.answers.category.choice;     // "billing" | "technical" | "other"
decision.answers.severity.level;      // "low" | "medium" | "high"
```

Confidence is the model's own figure. Do not treat it as a calibrated probability of being correct. Keep `requestId` and `model` with each decision so the outcome can be audited, and send high-risk or hard-to-reverse actions to a person before acting on them.

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
