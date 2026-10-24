# Frontal AI SDK

A powerful, type-safe AI SDK for Frontal. Provides unified access to LLMs, embeddings, and more.

## Features

- **Text Generation**: Generate text with advanced language models
- **Streaming**: Real-time text streaming for interactive applications
- **Embeddings**: Generate vector embeddings for semantic search
- **Structured Output**: Generate JSON objects with type safety
- **Speech Synthesis**: Convert text to natural speech
- **Image Generation**: Create images from text prompts
- **Video Generation**: Generate videos from descriptions
- **Audio Transcription**: Convert audio to text
- **Content Moderation**: Filter and moderate content
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

// Embeddings
const { embeddings } = await ai.embed({
  model: 'text-embedding-3-small',
  input: 'Hello, world!'
});

console.log(embeddings[0].length);
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
