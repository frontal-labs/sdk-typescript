# API Reference - @frontal/ai

## Class: `AI`

The main client for interacting with Frontal AI services.

### Constructor

```typescript
new AI(config?: { apiKey?: string; baseUrl?: string })
```
- `apiKey`: Optional. Your Frontal API key. Defaults to `FRONTAL_API_KEY` environment variable.
- `baseUrl`: Optional. Defaults to `https://ai.frontal.dev/v1`.

### Core Methods

#### `generateText(options)`

Generates text using a large language model.

- **Options**: `GenerateTextOptions`
  - `model`: string (e.g., "gpt-4o")
  - `prompt`: string | Message[]
  - `temperature?`: number
  - `maxTokens?`: number
  - `topP?`: number
  - `frequencyPenalty?`: number
  - `presencePenalty?`: number
  - `stopSequences?`: string[]
- **Returns**: `Promise<APIResponse<GenerateTextResult>>`

#### `generateObject<T>(options)`

Generates structured data conforming to a Zod schema.

- **Options**: `GenerateObjectOptions<T>`
  - `model`: string
  - `prompt`: string
  - `schema`: ZodSchema | Record<string, unknown>
  - `temperature?`: number
- **Returns**: `Promise<APIResponse<GenerateObjectResult<T>>>`

#### `streamText(options)`

Streams text generation responses.

- **Options**: `StreamTextOptions`
  - All `GenerateTextOptions`
  - `onChunk?`: (chunk: string) => void
- **Returns**: `StreamTextResult` containing `textStream` (ReadableStream).

#### `embed(options)`

Generates vector embeddings for text.

- **Options**: `EmbedOptions`
  - `model`: string
  - `input`: string | string[]
- **Returns**: `Promise<APIResponse<EmbedResult>>`

### Multimodal Methods

#### `generateImage(options)`

Generates images from text prompts.

- **Options**: `GenerateImageOptions`
  - `prompt`: string
  - `model?`: string (default: "dall-e-3")
  - `size?`: string (e.g., "1024x1024")
  - `quality?`: "standard" | "hd"
  - `style?`: "natural" | "vivid"
  - `n?`: number (1-10)
- **Returns**: `Promise<APIResponse<GenerateImageResult>>`

#### `generateSpeech(options)`

Converts text to spoken audio.

- **Options**: `GenerateSpeechOptions`
  - `text`: string
  - `voice`: string (e.g., "alloy", "echo")
  - `model?`: string (default: "tts-1")
  - `speed?`: number (0.25 - 4.0)
  - `format?`: "mp3" | "wav" | "opus"
- **Returns**: `Promise<APIResponse<ArrayBuffer>>`

#### `transcribe(options)`

Transcribes audio files to text.

- **Options**: `TranscriptionOptions`
  - `file`: File | Blob
  - `model`: string (e.g., "whisper-1")
  - `language?`: string
  - `prompt?`: string
  - `response_format?`: "json" | "text" | "srt" | "verbose_json" | "vtt"
  - `temperature?`: number
- **Returns**: `Promise<APIResponse<TranscriptionResult>>`

#### `generateVideo(options)`

Generates video from text prompts.

- **Options**: `GenerateVideoOptions`
  - `prompt`: string
  - `model?`: string
  - `duration?`: number
  - `resolution?`: string
  - `fps?`: number
- **Returns**: `Promise<APIResponse<GenerateVideoResult>>`

### Safety & Utilities

#### `moderate(options)`

Checks content against safety moderation policies.

- **Options**: `ModerationOptions`
  - `input`: string | string[]
  - `model?`: string
- **Returns**: `Promise<APIResponse<ModerationResult>>`

#### `listModels()`

Lists available models from the gateway.

- **Returns**: `Promise<APIResponse<string[]>>`

#### `countTokens(text)`

Roughly estimates token count (1 token ≈ 4 chars).

- **Returns**: number

### Prompt Management

#### `createPrompt(options)`
Creates a reusable prompt template.

#### `getPrompt(name, version?)`
Retrieves a prompt by name. Returns `APIResponse<Prompt>`. Check `response.error` for not-found (404).

#### `updatePrompt(name, updates)`
Updates an existing prompt. Returns `APIResponse<Prompt>`.

### Tool System

#### `defineTool(options)`
Defines a type-safe tool.

#### `registerTool(tool)`
Registers a tool with the client.

#### `executeTool(name, params)`
Executes a registered tool. Returns `Promise<APIResponse<unknown>>`. Check `response.error` for not-found (404) or execution errors.
