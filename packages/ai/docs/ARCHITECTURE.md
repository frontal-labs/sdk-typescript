# AI SDK Architecture

The `@frontal-labs/ai` SDK is a type-safe client for the Frontal AI Gateway (`https://ai.frontal.dev` by default). The gateway exposes an OpenAI-compatible chat API plus internal endpoints for embeddings, predictions (speech, images, video, transcription, moderation), reranking, and model discovery. The SDK maps typed options onto those endpoints and returns typed results.

## Core Components

### 1. `AISdk` Client
The entry point, created with `createAIClient()` or the `ai` singleton (`src/client.ts`). It handles:
- **Authentication and transport**: an `HttpClient` from `@frontal-labs/core` carries the API key, timeout, retries, and interceptors.
- **Request dispatch**: each method posts to a fixed path (see [API Gateway Integration](#3-api-gateway-integration)).
- **Tool loop**: `generateText({ maxSteps, tools })` runs the call → execute → feed-back cycle internally (`src/sdk.ts`).
- **Prompt and tool registries**: legacy in-memory helpers (`createPrompt`, `registerTool`) that are never sent to the model.

### 2. Type System (Zod)
We use [Zod](https://zod.dev) for runtime validation and static type inference.
- **Input validation**: option schemas (`embedOptionsSchema`, `generateSpeechOptionsSchema`, …) are parsed before any request is sent. Invalid input throws a `ZodError`.
- **Output typing**: result types are declared in `src/schemas.ts` and returned directly.

### 3. API Gateway Integration
Paths are relative to the gateway base URL:

| Capability | Method | Path |
|------------|--------|------|
| Text / chat (incl. tools, JSON mode) | `generateText`, `streamText`, `generateObject` | `/ai/chat/completions` |
| Embeddings | `embed` | `/internal/embeddings` |
| Speech, images, video, transcription, moderation | `generateSpeech`, `generateImage`, `generateVideo`, `transcribe`, `moderate` | `/internal/predictions` (transcription uses multipart form data) |
| Reranking | `rerank` | `/internal/rerank` |
| Model discovery | `listModels`, `getDefaultModels` | `/internal/models`, `/internal/models/defaults` |
| Health | `health` | `/health` |

The chat endpoint follows the OpenAI request/response shape (`messages`, `tools`, `choices[0].message`, `usage.promptTokens`), and the embeddings endpoint returns OpenAI-style `data[].embedding`.

### 4. Response Handling
Methods return their result object directly, not a wrapper:

```typescript
const { text, usage, toolCalls } = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Hello",
});
```

Failures are thrown:
- **`FrontalError`** (from `@frontal-labs/core`) for API errors. It exposes `code`, `statusCode`, `requestId`, `retryable`, and an optional `fix` hint.
- **`ZodError`** for invalid options, before any request is sent.

`generateObject` retries on 5xx, 429, and malformed JSON up to `maxRetries`. Other errors are rethrown on the first attempt.

## Data Flow

1. **User call**: `ai.generateText({ model, prompt: "Hello" })`
2. **Validation**: options are checked (Zod for the schema-backed methods).
3. **Transformation**: options map to a `ChatCompletionRequest` (OpenAI format), with tools converted by `toolSetToRequest`.
4. **Network**: `HttpClient.post("/ai/chat/completions", body)` against the gateway base URL.
5. **Gateway processing**: the gateway routes the request to the upstream provider and returns an OpenAI-shaped response.
6. **Response mapping**: the raw JSON becomes a `GenerateTextResult` (text, finish reason, usage, tool calls, steps).
7. **Result**: the caller receives the typed result, or a thrown error.
