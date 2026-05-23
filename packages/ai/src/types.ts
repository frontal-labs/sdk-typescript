import { z } from "zod";

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
  message: string;
  statusCode: number;
  name: string;
}

/**
 * Standard API response structure.
 */
export interface APIResponse<T> {
  data: T | null;
  error: ErrorResponse | null;
  headers: Record<string, string> | null;
}

/**
 * Zod schema for a message in a conversation.
 */
export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

/**
 * TypeScript interface for a message, inferred from the schema.
 */
export type Message = z.infer<typeof messageSchema>;

/**
 * Zod schema for common generation options.
 */
export const generateTextOptionsSchema = z.object({
  model: z.string(),
  prompt: z.union([z.string(), z.array(messageSchema)]),
  messages: z.array(messageSchema).optional(), // Keep for backward compatibility if needed, or remove. User asked for prompt.
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
});

/**
 * Generation options.
 */
export type GenerateTextOptions = z.infer<typeof generateTextOptionsSchema>;

/**
 * Result of a text generation.
 */
export const generateTextResultSchema = z.object({
  text: z.string(),
  finishReason: z.enum([
    "stop",
    "length",
    "content-filter",
    "tool-calls",
    "error",
    "other",
  ]),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
});

/**
 * Generation result.
 */
export type GenerateTextResult = z.infer<typeof generateTextResultSchema>;

/**
 * Options for streaming text.
 */
export const streamTextOptionsSchema = generateTextOptionsSchema.extend({
  onChunk: z
    .function({ input: z.tuple([z.string()]), output: z.void() })
    .optional(),
});

/**
 * Streaming options.
 */
export type StreamTextOptions = z.infer<typeof streamTextOptionsSchema>;

/**
 * Result of a streaming generation.
 */
export interface StreamTextResult {
  /**
   * The stream of text chunks.
   */
  textStream: ReadableStream<string>;
  /**
   * Promise that resolves to the final usage statistics.
   */
  usage: Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
}

/**
 * Schema for embedding options.
 */
export const embedOptionsSchema = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
});

/**
 * Embedding options.
 */
export type EmbedOptions = z.infer<typeof embedOptionsSchema>;

/**
 * Result of an embedding generation.
 */
export interface EmbedResult {
  /**
   * The generated embeddings.
   */
  embeddings: number[][];
  /**
   * Usage statistics.
   */
  usage: {
    totalTokens: number;
  };
}

/**
 * Configuration for the Frontal AI provider.
 */
export const aiConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

/**
 * Frontal configuration.
 */
export type AIConfig = z.infer<typeof aiConfigSchema>;

/**
 * Interface for the AI client.
 */
export interface IAIClient {
  /**
   * Generates text based on the provided options.
   */
  generateText(
    options: GenerateTextOptions
  ): Promise<APIResponse<GenerateTextResult>>;
  /**
   * Streams text based on the provided options.
   */
  streamText(options: StreamTextOptions): StreamTextResult; // StreamTextResult is special, handled differently
  /**
   * Generates embeddings for the provided input.
   */
  embed(options: EmbedOptions): Promise<APIResponse<EmbedResult>>;
  /**
   * Generates structured object based on the provided options.
   */
  generateObject<T>(
    options: GenerateObjectOptions<T>
  ): Promise<APIResponse<GenerateObjectResult<T>>>;
  /**
   * Generates speech from text.
   */
  generateSpeech(
    options: GenerateSpeechOptions
  ): Promise<APIResponse<ArrayBuffer>>;
  /**
   * Generates an image from a prompt.
   */
  generateImage(
    options: GenerateImageOptions
  ): Promise<APIResponse<GenerateImageResult>>;
  /**
   * Generates a video from a prompt.
   */
  generateVideo(
    options: GenerateVideoOptions
  ): Promise<APIResponse<GenerateVideoResult>>;
  /**
   * Transcribes audio to text.
   */
  transcribe(
    options: TranscriptionOptions
  ): Promise<APIResponse<TranscriptionResult>>;
  /**
   * Moderates content.
   */
  moderate(options: ModerationOptions): Promise<APIResponse<ModerationResult>>;
  /**
   * Retrieves a prompt by name.
   */
  getPrompt(name: string, version?: string): APIResponse<Prompt>;
  /**
   * Updates an existing prompt.
   */
  updatePrompt(name: string, updates: Partial<Prompt>): APIResponse<Prompt>;
  /**
   * Executes a registered tool by name.
   */
  executeTool(name: string, params: unknown): Promise<APIResponse<unknown>>;
}

/**
 * Zod schema for structured output generation options.
 */
export const generateObjectOptionsSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  schema: z.any(), // ZodSchema or JSONSchema, handled as any in types for flexibility
  temperature: z.number().min(0).max(2).optional(),
  maxRetries: z.number().optional(),
});

export type GenerateObjectOptions<T> = Omit<
  z.infer<typeof generateObjectOptionsSchema>,
  "schema"
> & {
  schema: z.ZodSchema<T> | Record<string, unknown>;
};

export interface GenerateObjectResult<T> {
  object: T; // Using 'object' field to match conventional AI SDKs (like Vercel AI SDK)
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Zod schema for speech generation options.
 */
export const generateSpeechOptionsSchema = z.object({
  text: z.string(),
  voice: z.string(),
  model: z.string().optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
  format: z.enum(["mp3", "wav", "opus"]).optional(),
});

export type GenerateSpeechOptions = z.infer<typeof generateSpeechOptionsSchema>;

/**
 * Zod schema for image generation options.
 */
export const generateImageOptionsSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  size: z.string().optional(),
  quality: z.enum(["standard", "hd"]).optional(),
  style: z.enum(["natural", "vivid"]).optional(),
  n: z.number().min(1).max(10).optional(),
});

export type GenerateImageOptions = z.infer<typeof generateImageOptionsSchema>;

export interface GenerateImageResult {
  images: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * Zod schema for video generation options.
 */
export const generateVideoOptionsSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  duration: z.number().optional(),
  resolution: z.string().optional(),
  fps: z.number().optional(),
  aspectRatio: z.string().optional(),
});

export type GenerateVideoOptions = z.infer<typeof generateVideoOptionsSchema>;

export interface GenerateVideoResult {
  videoUrl: string;
}

// Prompt Management Types

export interface VariableDefinition {
  type: "string" | "number" | "boolean";
  description?: string;
  defaultValue?: string | number | boolean;
}

export interface Prompt {
  name: string;
  template: string;
  variables: Record<string, VariableDefinition>;
  metadata?: Record<string, unknown>;
  version?: string;
}

export interface PromptChain {
  prompts: Prompt[];
}

// Tool System Types

export interface Tool<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams> | Record<string, unknown>;
  execute: (params: TParams) => Promise<TResult>;
}
// OpenAI-compatible types

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "function", "tool"]),
  content: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  tool_calls: z.array(z.any()).optional(), // Simplified for brevity
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  logit_bias: z.record(z.string(), z.number()).optional(),
  user: z.string().optional(),
  response_format: z
    .object({ type: z.enum(["text", "json_object"]) })
    .optional(),
  seed: z.number().optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z
    .union([
      z.string(),
      z.object({ type: z.string(), function: z.object({ name: z.string() }) }),
    ])
    .optional(),
});

export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;

export const chatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: chatMessageSchema,
      finish_reason: z.string().nullable(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
  system_fingerprint: z.string().optional(),
});

export type ChatCompletionResponse = z.infer<
  typeof chatCompletionResponseSchema
>;

export const chatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion.chunk"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      delta: z.object({
        role: z.enum(["system", "user", "assistant", "tool"]).optional(),
        content: z.string().nullable().optional(),
        tool_calls: z.array(z.any()).optional(),
      }),
      finish_reason: z.string().nullable(),
    })
  ),
});

export type ChatCompletionChunk = z.infer<typeof chatCompletionChunkSchema>;

export const embeddingsRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string(),
  encoding_format: z.enum(["float", "base64"]).optional(),
  dimensions: z.number().optional(),
  user: z.string().optional(),
});

export type EmbeddingsRequest = z.infer<typeof embeddingsRequestSchema>;

export const embeddingsResponseSchema = z.object({
  object: z.literal("list"),
  data: z.array(
    z.object({
      object: z.literal("embedding"),
      embedding: z.array(z.number()),
      index: z.number(),
    })
  ),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export type EmbeddingsResponse = z.infer<typeof embeddingsResponseSchema>;

export const transcriptionOptionsSchema = z.object({
  file: z.any(), // File or Blob, hard to type strictly in Node/Bun environment without specific types, keeping any or generic
  model: z.string(),
  language: z.string().optional(),
  prompt: z.string().optional(),
  response_format: z
    .enum(["json", "text", "srt", "verbose_json", "vtt"])
    .optional(),
  temperature: z.number().optional(),
});

export type TranscriptionOptions = z.infer<typeof transcriptionOptionsSchema>;

export interface TranscriptionResult {
  text: string;
}

export const moderationOptionsSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().optional(),
});

export type ModerationOptions = z.infer<typeof moderationOptionsSchema>;

export interface ModerationResult {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
}
