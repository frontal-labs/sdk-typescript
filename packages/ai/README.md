# @frontal-labs/ai

AI inference SDK — text generation, streaming, embeddings, structured output,
speech, transcription, and image/video generation.

## Installation

```bash
npm install @frontal-labs/ai
```

`frontal/core` is included automatically as a dependency.

## Quick Start

```ts
import { ai } from "@frontal-labs/ai";

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Summarize this incident report",
});
```

The `ai` singleton reads `FRONTAL_API_KEY` and `FRONTAL_AI_API_URL` from the
environment.

## Usage

### Explicit config

```ts
import { createAIClient } from "@frontal-labs/ai";

const ai = createAIClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://ai.frontal.dev",
});

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Hello",
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "frontal/core";
import { createAIClient } from "@frontal-labs/ai";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const ai = createAIClient(client);
```

### Streaming

```ts
const stream = ai.streamText({
  model: "gpt-4o-mini",
  prompt: "Write a haiku about databases",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Embeddings

```ts
const emb = await ai.embed({
  model: "text-embedding-3-small",
  input: "How to reset account password",
});
```

### Structured output

```ts
const parsed = await ai.generateObject({
  model: "gpt-4o-mini",
  prompt: "Extract severity and service from this report: ...",
  schema: {
    type: "object",
    properties: {
      severity: { type: "string" },
      service: { type: "string" },
    },
    required: ["severity", "service"],
  },
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
