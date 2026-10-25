# Frontal AI SDK

A powerful, type-safe AI SDK for Frontal. Provides unified access to LLMs, structured decisions, and more.

## Features

- **Text Generation**: Generate text with advanced language models
- **Streaming**: Real-time text streaming for interactive applications
- **Structured Decisions**: Typed yes/no, choice and score questions with typed answers
- **Structured Output**: Generate JSON objects with type safety
- **Prompt Management**: Organize and version prompts
- **Tool System**: Define and execute custom tools

## Installation

```bash
bun add @frontal-labs/ai
```

## Quick Start

```typescript
import { ai } from '@frontal-labs/ai';

// Text generation
const { text } = await ai.generateText({
  model: 'gpt-4o-mini',
  prompt: 'Write a story about a robot learning to paint.',
  maxTokens: 500,
  temperature: 0.7
});

console.log(text);

// Streaming
const stream = ai.streamText({
  model: 'gpt-4o-mini',
  prompt: 'Tell me about artificial intelligence'
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// Structured decisions
import { choice, noul } from '@frontal-labs/ai';

const decision = await ai.decisions.decide({
  model: 'frontal-labs/decision-4B',
  state: { message: 'Hello, world!' },
  questions: {
    greeting: noul('Is this a greeting?'),
    tone: choice('What tone is it?', { friendly: null, neutral: null }),
  },
});

console.log(decision.answers.greeting.noul, decision.answers.tone.choice);
```

Methods return their results directly and throw a `FrontalError` on failure.

## Configuration

Configure the SDK using environment variables:

```bash
FRONTAL_API_KEY=your_api_key
```

Or create a custom client:

```typescript
import { createAIClient } from '@frontal-labs/ai';

const ai = createAIClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://ai.frontal.dev'
});
```

## Documentation

- [Overview](./OVERVIEW.md) - Complete package overview
- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Developer Guide](./GUIDE.md) - Advanced usage patterns
- [Examples](./EXAMPLES.md) - Code examples and tutorials
- [Testing](./TESTING.md) - Testing guide
