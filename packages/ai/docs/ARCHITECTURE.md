# AI SDK Architecture

The `@frontal-labs/ai` SDK is designed as a modular, type-safe client that interacts with the Frontal AI Gateway (powered by Helicone). It abstracts the complexities of different AI models and providers behind a unified, OpenAI-compatible interface.

## Core Components

### 1. `AI` Client
The central entry point for the SDK. It handles:
- **Authentication**: Managing API keys and headers.
- **Request Dispatch**: sending requests to `https://ai.frontal.dev/v1`.
- **Error Handling**: Standardizing errors into `APIResponse<T>` format.
- **State Management**: Managing local prompt and tool registries.

### 2. Type System (Zod)
We use [Zod](https://zod.dev) for runtime validation and static type inference.
- **Input Validation**: usage of `z.parse()` ensures all requests meet the required schema before reaching the API.
- **Output Typing**: Response types are inferred from Zod schemas, providing full type safety to the consumer.

### 3. API Gateway Integration
The SDK calls specific endpoints mapped to the OpenAI API specification:
- Text/Chat: `/v1/chat/completions`
- Embeddings: `/v1/embeddings`
- Audio: `/v1/audio/speech` & `/v1/audio/transcriptions`
- Images: `/v1/images/generations`
- Moderation: `/v1/moderations`

### 4. Response Handling
All async methods return a standardized `APIResponse<T>` envelope:
```typescript
interface APIResponse<T> {
  data: T | null;
  error: ErrorResponse | null;
  headers: Record<string, string> | null;
}
```
This forces developers to handle both success and error states explicitly.

## Data Flow

1. **User Call**: `ai.generateText({ prompt: "Hello" })`
2. **Validation**: `generateTextOptionsSchema.parse(...)`
3. **Transformation**: SDK maps options to `ChatCompletionRequest` (OpenAI format).
4. **Network**: `fetch` request to `ai.frontal.dev/v1/chat/completions`.
5. **Gateway Processing**: Helicone gateway routes to LLM provider (OpenAI, Anthropic, etc.), logs request, caches if enabled.
6. **Response Map**: SDK maps raw JSON response back to `GenerateTextResult`.
7. **Result**: User receives typed result.
