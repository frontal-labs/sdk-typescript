# @frontal/ai

A powerful, type-safe AI SDK for Frontal. Interacts seamlessly with the Frontal AI Gateway to provide access to LLMs, embeddings, and multimodal capabilities.

## Features

- **Unified Interface**: Simple, consistent API for various AI tasks.
- **Strict Validation**: All inputs and outputs are validated with Zod.
- **Multimodal**: Support for Text, Image, Audio (Speech & Transcription), and Video.
- **Structured Output**: reliable valid JSON generation using `generateObject`.
- **Tools & Prompts**: Built-in systems for managing prompts and tools.
- **Gateway Integrated**: Pre-configured for `ai.frontal.dev` (Helicone).

## Installation

```bash
bun add @frontal/ai
```

## Documentation

- [Overview](docs/OVERVIEW.md)
- [Integration Guide](docs/GUIDE.md)
- [API Reference](docs/API-REFERENCE.md)
- [Architecture](docs/ARCHITECTURE.md)

## Usage

### Text Generation

```typescript
import { AI } from '@frontal/ai';
const ai = new AI();

const result = await ai.generateText({
  model: 'gpt-4o',
  prompt: 'Hello world!',
});
```

### Structured Data
```typescript
import { z } from "zod";

const result = await ai.generateObject({
  model: 'gpt-4o',
  prompt: 'Extract user info',
  schema: z.object({ name: z.string(), age: z.number() })
});
```

### Generate Image
```typescript
const image = await ai.generateImage({
  prompt: "A futuristic city",
  size: "1024x1024"
});
```

### Transcribe Audio
```typescript
const transcript = await ai.transcribe({
  file: audioFileBlob,
  model: "whisper-1"
});
```

## License

MIT
