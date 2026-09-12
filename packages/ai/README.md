# @frontal-labs/ai

AI inference SDK — text generation, streaming, embeddings, structured output,
speech, transcription, and image/video generation.

## Installation

```bash
npm install @frontal-labs/ai
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const ai = f.ai;

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Summarize this incident report",
});
```


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
import { FrontalClient } from "@frontal-labs/core";
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
console.log(await stream.usage, await stream.finishReason);
```

`textStream` and `fullStream` are two views of the same request — read one of
them from the start. Breaking out of the loop cancels the request.

`fullStream` yields every part — `text`, `tool-call`, `finish`, `error`,
`abort`, `done` — so errors are data you can render and retry, not exceptions
that tear down the UI:

```ts
const ctl = new AbortController();
const stream = ai.streamText({
  model: "gpt-4o-mini",
  prompt: "Write a haiku about databases",
  signal: ctl.signal,
  streamRetries: 2, // retry 429/5xx/network failures before the first byte
  onError: (err) => console.error(err.code, err.fix),
});

for await (const part of stream.fullStream) {
  if (part.type === "text") process.stdout.write(part.text);
  if (part.type === "tool-call") console.log(part.toolName, part.input);
  if (part.type === "error" && !part.error.retryable) ctl.abort();
}
```

### Tools

Define tools with `tool()` (Zod input schema → JSON Schema on the wire) and
pass them to `generateText` / `streamText`. The SDK returns the model's calls;
you execute them — there is no hidden loop.

```ts
import { parseToolInput, tool } from "@frontal-labs/ai";
import { z } from "zod";

const tools = {
  weather: tool({
    description: "Current weather for a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => ({ city, tempC: 21 }),
  }),
};

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "What's the weather in Lisbon?",
  tools,
  toolChoice: "auto",
});

for (const call of result.toolCalls) {
  if (call.toolName === "weather") {
    const input = parseToolInput(tools, "weather", call.input);
    console.log(await tools.weather.execute?.(input));
  }
}
```

The same `ToolSet` type is accepted by `agents.define(name, { tools })`.

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
