# @frontal/ai

AI inference SDK for Frontal with text, embeddings, multimodal generation, and streaming APIs.

## Installation

```bash
bun add @frontal/ai @frontal/core
```

## Usage

```ts
import { createAIClient } from "@frontal/ai";

const ai = createAIClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_AI_API_URL ?? "https://ai.frontal.dev",
});

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Summarize this incident report",
});
```

## Configuration

- `FRONTAL_API_KEY`
- `FRONTAL_AI_API_URL` (optional)

Default base URL: `https://ai.frontal.dev`.
