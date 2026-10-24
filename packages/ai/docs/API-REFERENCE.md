# API Reference - @frontal-labs/ai

## Creating a client

```typescript
import { createAIClient, ai } from "@frontal-labs/ai";
import { FrontalClient } from "@frontal-labs/core";

// Standalone
const client = createAIClient({ apiKey: "frt_..." });

// From a shared FrontalClient
const shared = createAIClient(new FrontalClient({ apiKey: "frt_..." }));

// Lazy default singleton, configured from FRONTAL_API_KEY
ai.generateText({ model: "gpt-4o-mini", prompt: "Hello" });
```

### `AIClientConfig`

- `apiKey` (required): Frontal API key.
- `baseUrl?`: AI gateway base URL. Defaults to `https://ai.frontal.dev`. Regional gateways are `https://ai.us.frontal.dev`, `https://ai.eu.frontal.dev`, and `https://ai.ap.frontal.dev`. A `FrontalClient` passed to `createAIClient` always uses the gateway default, even if it was created with a different `baseUrl`; pass a config object with `baseUrl` to change it.
- `timeout?`: Request timeout in ms. Default `30_000`.
- `maxRetries?`: Retry attempts. Default `3`.
- `interceptors?`: Interceptors applied to the HTTP client (e.g. governance policy enforcement).

### Errors

Methods return their result directly and throw on failure:

- `FrontalError` (from `@frontal-labs/core`) for API errors: `code`, `statusCode`, `requestId`, `retryable`, optional `fix`.
- `ZodError` for invalid options, thrown before any request is sent.

```typescript
import { FrontalError } from "@frontal-labs/core";

try {
  const { text } = await client.generateText({ model: "gpt-4o-mini", prompt: "Hi" });
} catch (err) {
  if (err instanceof FrontalError && err.retryable) {
    // retry later
  }
  throw err;
}
```

## Class: `AISdk`

Returned by `createAIClient()` and the `ai` singleton. You normally don't construct it directly.

### Text Generation

#### `generateText(options): Promise<GenerateTextResult>`

- **Options**: `GenerateTextOptions`
  - `model`: string (e.g. `"gpt-4o-mini"`)
  - `prompt`: string | Message[]
  - `messages?`: Message[] (takes precedence over `prompt` when set)
  - `temperature?`: number (0–2)
  - `maxTokens?`: number
  - `topP?`: number (0–1)
  - `frequencyPenalty?`: number (-2–2)
  - `presencePenalty?`: number (-2–2)
  - `stopSequences?`: string[]
  - `tools?`: ToolSet (build with `tool()`)
  - `toolChoice?`: `"auto"` | `"none"` | `"required"` | `{ toolName }`
  - `maxSteps?`: number (1–50). Default `1`. When greater than 1 and the model calls tools that have `execute`, the SDK runs them, feeds the results back, and repeats.
  - `onStepFinish?`: (step: ToolLoopStep) => void
- **Returns**: `GenerateTextResult`
  - `text`, `finishReason`, `usage` (`promptTokens`, `completionTokens`, `totalTokens`)
  - `toolCalls`: calls the model requested. When `maxSteps` is 1, or a call has no `execute`, run them yourself.
  - `toolResults`, `steps`

#### `streamText(options): StreamTextResult`

Streams a response. Not async; the request starts when you read a stream.

- **Options**: `StreamTextOptions` (all `GenerateTextOptions` fields that apply, plus)
  - `onChunk?`: (chunk: string) => void
  - `onError?`, `onAbort?`
  - `signal?`: AbortSignal
  - `streamRetries?`: number
- **Returns**: `StreamTextResult`
  - `textStream`: `ReadableStream<string>`
  - `fullStream`: `ReadableStream<TextStreamPart>` (`text`, `tool-call`, `finish`, `error`, `abort`, `done`)
  - `finishReason`: `Promise<FinishReason>`
  - `usage`: `Promise<{ promptTokens, completionTokens, totalTokens }>`

`textStream` and `fullStream` are two views of one request. Read one of them from the start.

```typescript
const stream = ai.streamText({ model: "gpt-4o-mini", prompt: "Write a haiku" });
for await (const chunk of stream.textStream) process.stdout.write(chunk);
```

#### `generateObject<T>(options): Promise<GenerateObjectResult<T>>`

Generates JSON that matches a schema. The schema is sent to the model as JSON-mode instructions; a Zod schema also validates the parsed result.

- **Options**: `GenerateObjectOptions<T>`
  - `model`: string
  - `prompt`: string
  - `schema`: `z.ZodType<T>` | `Record<string, unknown>` (JSON Schema)
  - `temperature?`: number (0–2)
  - `maxRetries?`: number. Retries on 5xx, 429, empty output, and invalid JSON. Default `0`.
- **Returns**: `{ object: T, usage }`

### Embeddings

#### `embed(options): Promise<EmbedResult>`

- **Options**: `EmbedOptions`
  - `model`: string (e.g. `"text-embedding-3-small"`). There is no default embedding model; pass one explicitly.
  - `input`: string | string[]
- **Returns**: `{ embeddings: number[][], usage: { totalTokens } }`. `embeddings` is in input order.

#### `rerank(options): Promise<{ scores: number[], usage? }>`

Scores documents by relevance to a query. Returns one score per document, in input order.

- **Options**
  - `model`: string (reranking model; see `getDefaultModels()`)
  - `query`: string
  - `documents`: (string | `{ content, sourcePath?, chunkIndex?, metadata? }`)[]
  - `topK?`: number
  - `criteria?`: string

### Multimodal Methods

#### `generateImage(options): Promise<GenerateImageResult>`

- **Options**: `GenerateImageOptions`
  - `prompt`: string
  - `model?`: string (default `"dall-e-3"`)
  - `size?`: string (e.g. `"1024x1024"`; default `"1024x1024"`)
  - `quality?`: `"standard"` | `"hd"`
  - `style?`: `"natural"` | `"vivid"`
  - `n?`: number (1–10; default `1`)
- **Returns**: `{ images: { url?, b64Json? }[] }`

#### `generateSpeech(options): Promise<ArrayBuffer>`

- **Options**: `GenerateSpeechOptions`
  - `text`: string
  - `voice`: string (e.g. `"alloy"`, `"echo"`)
  - `model?`: string (default `"tts-1"`)
  - `speed?`: number (0.25–4.0)
  - `format?`: `"mp3"` | `"wav"` | `"opus"`
- **Returns**: the audio bytes as an `ArrayBuffer`

#### `transcribe(options): Promise<TranscriptionResult>`

- **Options**: `TranscriptionOptions`
  - `file`: File | Blob
  - `model`: string (e.g. `"whisper-1"`)
  - `language?`: string
  - `prompt?`: string
  - `responseFormat?`: `"json"` | `"text"` | `"srt"` | `"verbose_json"` | `"vtt"`
  - `temperature?`: number
- **Returns**: `{ text: string }`

#### `generateVideo(options): Promise<GenerateVideoResult>`

- **Options**: `GenerateVideoOptions`
  - `prompt`: string
  - `model?`: string
  - `duration?`: number
  - `resolution?`: string
  - `fps?`: number
  - `aspectRatio?`: string
- **Returns**: `{ videoUrl: string, ... }`

### Safety & Utilities

#### `moderate(options): Promise<ModerationResult>`

- **Options**: `ModerationOptions`
  - `input`: string | string[]
  - `model?`: string (default `"text-moderation-latest"`)
- **Returns**: `{ id, model, results: { flagged, categories, categoryScores }[] }`

#### `listModels(): Promise<string[]>`

Model IDs available from the gateway.

#### `getDefaultModels(): Promise<Record<string, string>>`

The gateway's default model ID per capability (for example chat, reranking, embedding).

#### `health(): Promise<{ status: string }>`

Gateway health check.

#### `countTokens(text): number`

Rough estimate: 1 token ≈ 4 characters. Not a tokenizer.

#### `estimateCost({ model, inputTokens, outputTokens }): number`

Placeholder pricing. Only the `frontal-ai-fast` and default rates are defined.

### Prompt Management (in-memory)

These helpers keep templates in the client's memory. They are not stored on the server.

- `createPrompt({ name, template, variables, metadata? }): Prompt`. Registers a template at version `1.0.0`.
- `getPrompt(name, version?): Prompt`. Throws if the name is unknown. A mismatched `version` logs a warning and returns the stored prompt.
- `updatePrompt(name, updates): Prompt`. Merges fields into an existing prompt.
- `chainPrompts(...prompts): PromptChain`

### Tool System

Build each tool with `tool()` (exported from `@frontal-labs/ai`) and pass a `ToolSet` keyed by tool name to `generateText({ tools })`:

```typescript
import { tool } from "@frontal-labs/ai";
import { z } from "zod";

const tools = {
  weather: tool({
    description: "Get the weather for a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => ({ city, tempC: 21 }),
  }),
};

const { text } = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "What's the weather in Lisbon?",
  tools,
  maxSteps: 3,
});
```

The legacy `defineTool`, `registerTool`, `getTools`, and `executeTool` methods are deprecated. They keep an in-memory registry that is never sent to the model.
