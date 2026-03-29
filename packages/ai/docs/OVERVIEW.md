# @frontal/ai

The **Frontal AI SDK** is the definitive toolkit for building intelligent applications on the Frontal platform. It provides a unified, type-safe interface to state-of-the-art AI models for text, image, audio, and video.

## Key Features

- **Universal Model Access**: Access GPT-4, DALL-E 3, Whisper, and more through a single API.
- **Type-Safe Interactions**: Built with TypeScript and Zod to ensure robustness at compile-time and run-time.
- **Multimodal Capabilities**:
    - **Text**: Chat, completion, and JSON extraction.
    - **Image**: Generation and editing.
    - **Audio**: Text-to-Speech (TTS) and Transcription (STT).
    - **Video**: Generation support.
- **Developer Tools**: Built-in Prompt Management and Tool execution systems.
- **Production Ready**: Integrated with Helicone AI Gateway for observability, caching, and rate limiting.

## Installation

```bash
bun add @frontal/ai
```

## Quick Start

```typescript
import { AI } from "@frontal/ai";

const ai = new AI();

const { text } = await ai.generateText({
  model: "gpt-4o",
  prompt: "What is the future of AI?",
});

console.log(text);
```
