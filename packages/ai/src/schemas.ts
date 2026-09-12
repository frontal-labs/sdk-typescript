import type {
  APIResponse,
  SdkError,
  ToolCall,
  ToolSet,
} from "@frontal-labs/core";
import { z } from "zod";
import type { TextStreamPart } from "./stream";
import type { ToolChoice } from "./tool";

export type { APIResponse, ErrorResponse } from "@frontal-labs/core";

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
  messages: z.array(messageSchema).optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  /**
   * Tools the model may call, keyed by name. Build with `tool()`; input
   * schemas are sent as JSON Schema. Calls come back in `toolCalls`
   * (`generateText`) or as `tool-call` parts (`streamText().fullStream`).
   */
  tools: z.custom<ToolSet>().optional(),
  /** `"auto"` (default), `"none"`, `"required"`, or `{ toolName }`. */
  toolChoice: z.custom<ToolChoice>().optional(),
  /**
   * Tool loop budget. When > 1 and the model requests tools that have an
   * `execute`, the SDK runs them, appends the results, and asks the model
   * again — up to this many model calls. Default 1 (no loop; calls are
   * returned in `toolCalls` for you to run).
   */
  maxSteps: z.number().int().min(1).max(50).optional(),
  /** Called after each step of the tool loop. */
  onStepFinish: z.custom<(step: ToolLoopStep) => void>().optional(),
});

/**
 * Generation options.
 */
export type GenerateTextOptions = z.input<typeof generateTextOptionsSchema>;

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
  /** Tool calls requested by the model (empty when none). */
  toolCalls: z.array(z.custom<ToolCall>()).default([]),
  /** Results of tools the SDK executed during a `maxSteps` loop. */
  toolResults: z.array(z.custom<ToolResult>()).default([]),
  /** One entry per model call when `maxSteps` > 1 (otherwise a single step). */
  steps: z.array(z.custom<ToolLoopStep>()).default([]),
});

/** Output of one executed tool call. */
export interface ToolResult<TOutput = unknown> {
  id?: string;
  toolName: string;
  input: unknown;
  output?: TOutput;
  /** Set when `execute` threw; the loop reports it to the model. */
  error?: string;
}

/** One model call inside a tool loop. */
export interface ToolLoopStep {
  step: number;
  text: string;
  finishReason:
    | "stop"
    | "length"
    | "content-filter"
    | "tool-calls"
    | "error"
    | "other";
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

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
  /** Abort the stream early. */
  signal: z.custom<AbortSignal>().optional(),
  /** Called for every error part (errors are data, not exceptions). */
  onError: z.custom<(error: SdkError) => void>().optional(),
  /** Called when `signal` aborts the stream. */
  onAbort: z.custom<() => void>().optional(),
  /** Retry the request if it fails before the first byte. Default 0. */
  streamRetries: z.number().int().min(0).max(5).optional(),
});

/**
 * Streaming options.
 */
export type StreamTextOptions = z.input<typeof streamTextOptionsSchema>;

/**
 * Result of a streaming generation.
 */
export interface StreamTextResult {
  /**
   * The stream of text chunks. Errors surface as stream errors here; use
   * `fullStream` to receive them as data.
   *
   * `textStream` and `fullStream` are two views of one request: read the
   * one you need from the start. Breaking out of either cancels the request
   * unless the other is still being read.
   */
  textStream: ReadableStream<string>;
  /**
   * Every part: `text`, `tool-call`, `finish`, `error`, `abort`, `done`.
   */
  fullStream: ReadableStream<TextStreamPart>;
  /** Resolves with the normalized finish reason. */
  finishReason: Promise<GenerateTextResult["finishReason"]>;
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
export type EmbedOptions = z.input<typeof embedOptionsSchema>;

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
  baseUrl: z.url().optional(),
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
  streamText(options: StreamTextOptions): StreamTextResult;
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
  schema: z.any(),
  temperature: z.number().min(0).max(2).optional(),
  maxRetries: z.number().optional(),
});

/**
 * Options for structured object generation, including a target schema.
 */
export type GenerateObjectOptions<T> = Omit<
  z.infer<typeof generateObjectOptionsSchema>,
  "schema"
> & {
  schema: z.ZodSchema<T> | Record<string, unknown>;
};

/**
 * Result of a structured object generation.
 */
export interface GenerateObjectResult<T> {
  object: T;
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

/**
 * Options for text-to-speech generation.
 */
export type GenerateSpeechOptions = z.input<typeof generateSpeechOptionsSchema>;

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

/**
 * Options for image generation.
 */
export type GenerateImageOptions = z.input<typeof generateImageOptionsSchema>;

/**
 * Result of an image generation request.
 */
export interface GenerateImageResult {
  images: {
    url?: string;
    b64Json?: string;
  }[];
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

/**
 * Options for video generation.
 */
export type GenerateVideoOptions = z.input<typeof generateVideoOptionsSchema>;

/**
 * Result of a video generation request.
 */
export interface GenerateVideoResult {
  videoUrl: string;
}

// Prompt Management Types

/**
 * Definition of a single variable within a prompt template.
 */
export interface VariableDefinition {
  type: "string" | "number" | "boolean";
  description?: string;
  defaultValue?: string | number | boolean;
}

/**
 * A named prompt template with typed variable definitions.
 */
export interface Prompt {
  name: string;
  template: string;
  variables: Record<string, VariableDefinition>;
  metadata?: Record<string, unknown>;
  version?: string;
}

/**
 * A chain of prompts executed in sequence.
 */
export interface PromptChain {
  prompts: Prompt[];
}

// Tool System Types

/**
 * A callable tool with a name, description, parameter schema, and executor.
 */
export interface Tool<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams> | Record<string, unknown>;
  execute: (params: TParams) => Promise<TResult>;
}
// OpenAI-compatible types

/**
 * Zod schema for a chat message in OpenAI-compatible format.
 */
export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "function", "tool"]),
  content: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  toolCalls: z.array(z.any()).optional(),
  /** For `role: "tool"` messages: the call this result answers. */
  toolCallId: z.string().optional(),
});

/**
 * A chat message with role and optional content/name/toolCalls.
 */
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Zod schema for an OpenAI-compatible chat completion request.
 */
export const chatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  maxTokens: z.number().optional(),
  presencePenalty: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  logitBias: z.record(z.string(), z.number()).optional(),
  user: z.string().optional(),
  responseFormat: z
    .object({ type: z.enum(["text", "json_object"]) })
    .optional(),
  seed: z.number().optional(),
  tools: z.array(z.any()).optional(),
  toolChoice: z
    .union([
      z.string(),
      z.object({ type: z.string(), function: z.object({ name: z.string() }) }),
    ])
    .optional(),
});

/**
 * OpenAI-compatible chat completion request.
 */
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;

/**
 * Zod schema for an OpenAI-compatible chat completion response.
 */
export const chatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: chatMessageSchema,
      finishReason: z.string().nullable(),
    })
  ),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
  systemFingerprint: z.string().optional(),
});

/**
 * OpenAI-compatible chat completion response.
 */
export type ChatCompletionResponse = z.infer<
  typeof chatCompletionResponseSchema
>;

/**
 * Zod schema for a streaming chat completion chunk.
 */
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
        toolCalls: z.array(z.any()).optional(),
      }),
      finishReason: z.string().nullable(),
    })
  ),
});

/**
 * A streaming chat completion chunk with delta content.
 */
export type ChatCompletionChunk = z.infer<typeof chatCompletionChunkSchema>;

/**
 * Zod schema for an OpenAI-compatible embeddings request.
 */
export const embeddingsRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string(),
  encodingFormat: z.enum(["float", "base64"]).optional(),
  dimensions: z.number().optional(),
  user: z.string().optional(),
});

/**
 * OpenAI-compatible embeddings request.
 */
export type EmbeddingsRequest = z.infer<typeof embeddingsRequestSchema>;

/**
 * Zod schema for an OpenAI-compatible embeddings response.
 */
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
    promptTokens: z.number(),
    totalTokens: z.number(),
  }),
});

/**
 * OpenAI-compatible embeddings response.
 */
export type EmbeddingsResponse = z.infer<typeof embeddingsResponseSchema>;

/**
 * Zod schema for audio transcription options.
 */
export const transcriptionOptionsSchema = z.object({
  file: z.any(),
  model: z.string(),
  language: z.string().optional(),
  prompt: z.string().optional(),
  responseFormat: z
    .enum(["json", "text", "srt", "verbose_json", "vtt"])
    .optional(),
  temperature: z.number().optional(),
});

/**
 * Options for audio transcription.
 */
export type TranscriptionOptions = z.input<typeof transcriptionOptionsSchema>;

/**
 * Result of an audio transcription.
 */
export interface TranscriptionResult {
  text: string;
}

/**
 * Zod schema for content moderation options.
 */
export const moderationOptionsSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().optional(),
});

/**
 * Options for content moderation.
 */
export type ModerationOptions = z.input<typeof moderationOptionsSchema>;

/**
 * Result of a content moderation check.
 */
export interface ModerationResult {
  id: string;
  model: string;
  results: {
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }[];
}
