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
bun add @frontal/ai
```

## Quick Start

```typescript
import { ai, generateText, streamText, embed } from '@frontal/ai';

// Text generation
const result = await generateText({
  model: 'frontal-ai-fast',
  prompt: 'Write a story about a robot learning to paint.',
  maxTokens: 500,
  temperature: 0.7
});

console.log(result.data?.text);

// Streaming
const stream = streamText({
  model: 'frontal-ai-fast',
  prompt: 'Tell me about artificial intelligence',
  onChunk: (chunk) => console.log(chunk)
});

for await (const chunk of stream.textStream) {
  console.log(chunk);
}

// Embeddings
const embeddings = await embed({
  model: 'text-embedding-ada-002',
  input: 'Hello, world!'
});

console.log(embeddings.data?.embeddings);
```

## Configuration

Configure the SDK using environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev/v1
```

Or create a custom client:

```typescript
import { AI } from '@frontal/ai';

const ai = new AI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.frontal.dev/v1'
});
```

## Documentation

- [Overview](./OVERVIEW.md) - Complete package overview
- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Developer Guide](./GUIDE.md) - Advanced usage patterns
- [Examples](./EXAMPLES.md) - Code examples and tutorials
- [Testing](./TESTING.md) - Testing guide
