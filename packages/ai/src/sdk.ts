import type { HttpClient } from "@frontal-labs/core";
import {
  FrontalError,
  parseToolInput,
  type ToolCall,
  toolSetToRequest,
} from "@frontal-labs/core";
import { z } from "zod";
import {
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type ChatMessage,
  type EmbeddingsResponse,
  type EmbedOptions,
  type EmbedResult,
  embedOptionsSchema,
  type GenerateImageOptions,
  type GenerateImageResult,
  type GenerateObjectOptions,
  type GenerateObjectResult,
  type GenerateSpeechOptions,
  type GenerateTextOptions,
  type GenerateTextResult,
  type GenerateVideoOptions,
  type GenerateVideoResult,
  generateImageOptionsSchema,
  generateSpeechOptionsSchema,
  generateVideoOptionsSchema,
  type ModerationOptions,
  type ModerationResult,
  moderationOptionsSchema,
  type Prompt,
  type PromptChain,
  type StreamTextOptions,
  type StreamTextResult,
  type Tool,
  type ToolLoopStep,
  type ToolResult,
  type TranscriptionOptions,
  type TranscriptionResult,
  transcriptionOptionsSchema,
  type VariableDefinition,
} from "./schemas";
import { streamChatParts, toStreamTextResult } from "./stream";
import { toolChoiceToRequest } from "./tool";

/**
 * Service for interacting with Frontal AI.
 * Takes an HttpClient and returns data directly, throwing typed errors.
 *
 * @example
 * ```typescript
 * import { createAIClient } from '@frontal-labs/ai'
 * import { FrontalClient } from '@frontal-labs/core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const ai = createAIClient(client)
 * const result = await ai.generateText({ model: 'gpt-4o-mini', prompt: 'Hello' })
 * ```
 */
export class AISdk {
  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {}

  // ── Text Generation ─────────────────────────────────────────────────

  /**
   * Generates text using a large language model.
   * @param options - Text generation options.
   * @returns The generation result.
   * @throws FrontalError on API errors, ZodError on validation errors.
   */
  async generateText(
    options: GenerateTextOptions
  ): Promise<GenerateTextResult> {
    if ((options.maxSteps ?? 1) > 1 && options.tools) {
      return this.runToolLoop(options);
    }
    return this.generateStep(options, this.buildMessages(options));
  }

  /**
   * Executes the tool loop behind `generateText({ maxSteps })`: call the
   * model, run every requested tool that has an `execute`, feed results
   * back, repeat. Tools without `execute` end the loop with their calls in
   * `toolCalls` so the caller can run them.
   */
  private async runToolLoop(
    options: GenerateTextOptions
  ): Promise<GenerateTextResult> {
    const maxSteps = options.maxSteps ?? 1;
    const tools = options.tools ?? {};
    const messages: ChatMessage[] = this.buildMessages(options);
    const steps: ToolLoopStep[] = [];
    const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let last: GenerateTextResult | undefined;

    for (let step = 1; step <= maxSteps; step++) {
      const result = await this.generateStep(
        { ...options, maxSteps: undefined },
        messages
      );
      usage.promptTokens += result.usage.promptTokens;
      usage.completionTokens += result.usage.completionTokens;
      usage.totalTokens += result.usage.totalTokens;

      const runnable = result.toolCalls.filter(
        (c) => tools[c.toolName]?.execute
      );
      const toolResults: ToolResult[] = [];
      for (const call of runnable) {
        const def = tools[call.toolName];
        if (!def?.execute) continue;
        try {
          const input = parseToolInput(tools, call.toolName, call.input);
          const output = await def.execute(input);
          toolResults.push({
            id: call.id,
            toolName: call.toolName,
            input,
            output,
          });
        } catch (err) {
          toolResults.push({
            id: call.id,
            toolName: call.toolName,
            input: call.input,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const entry: ToolLoopStep = {
        step,
        text: result.text,
        finishReason: result.finishReason,
        toolCalls: result.toolCalls,
        toolResults,
        usage: result.usage,
      };
      steps.push(entry);
      options.onStepFinish?.(entry);
      last = { ...result, toolResults, steps: [...steps], usage: { ...usage } };

      // Stop when the model is done, when nothing was runnable (caller's
      // turn), or when some calls were left for the caller.
      const allRan =
        result.toolCalls.length > 0 &&
        runnable.length === result.toolCalls.length;
      if (
        result.finishReason !== "tool-calls" ||
        !allRan ||
        step === maxSteps
      ) {
        break;
      }

      // Feed the exchange back in OpenAI format.
      messages.push({
        role: "assistant",
        content: result.text || null,
        toolCalls: result.toolCalls.map((c) => ({
          id: c.id,
          type: "function",
          function: {
            name: c.toolName,
            arguments: JSON.stringify(c.input ?? {}),
          },
        })),
      });
      for (const r of toolResults) {
        messages.push({
          role: "tool",
          toolCallId: r.id,
          name: r.toolName,
          content: JSON.stringify(
            r.error ? { error: r.error } : (r.output ?? null)
          ),
        });
      }
    }

    if (!last) throw new Error("generateText: no steps executed");
    return last;
  }

  /** One model call. */
  private async generateStep(
    options: GenerateTextOptions,
    messages: ChatMessage[]
  ): Promise<GenerateTextResult> {
    const requestBody: ChatCompletionRequest = {
      model: options.model,
      messages,
      temperature: options.temperature,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stopSequences,
      maxTokens: options.maxTokens,
      tools: options.tools ? toolSetToRequest(options.tools) : undefined,
      toolChoice: toolChoiceToRequest(options.toolChoice),
    };

    const response = await this.http.post<ChatCompletionResponse>(
      "/ai/chat/completions",
      requestBody
    );

    const choice = response.choices[0];
    const toolCalls = parseToolCalls(choice?.message?.toolCalls);
    const rawFinish = choice?.finishReason;
    const finishReason: GenerateTextResult["finishReason"] =
      rawFinish === "tool_calls" || (toolCalls.length > 0 && !rawFinish)
        ? "tool-calls"
        : (rawFinish as GenerateTextResult["finishReason"]) || "other";

    const usage = {
      promptTokens: response.usage?.promptTokens || 0,
      completionTokens: response.usage?.completionTokens || 0,
      totalTokens: response.usage?.totalTokens || 0,
    };
    const text = choice?.message?.content || "";
    return {
      text,
      finishReason,
      usage,
      toolCalls,
      toolResults: [],
      steps: [
        { step: 1, text, finishReason, toolCalls, toolResults: [], usage },
      ],
    };
  }

  // ── Streaming ────────────────────────────────────────────────────────

  /**
   * Streams text generation chunks.
   * @param options - Text generation options with optional onChunk callback.
   * @returns A result object containing the text stream and a usage promise.
   */
  streamText(options: StreamTextOptions): StreamTextResult {
    const messages = this.buildMessages(options);

    const requestBody: ChatCompletionRequest = {
      model: options.model,
      messages,
      temperature: options.temperature,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stopSequences,
      maxTokens: options.maxTokens,
      tools: options.tools ? toolSetToRequest(options.tools) : undefined,
      toolChoice: toolChoiceToRequest(options.toolChoice),
      stream: true,
    };

    const parts = streamChatParts(this.http, requestBody, {
      signal: options.signal,
      onChunk: options.onChunk,
      onError: options.onError,
      onAbort: options.onAbort,
      streamRetries: options.streamRetries,
    });
    return toStreamTextResult(parts);
  }

  // ── Embeddings ────────────────────────────────────────────────────────

  /**
   * Generates embeddings for text.
   * @param options - Embedding options.
   * @returns The embedding result.
   * @throws FrontalError on API errors.
   */
  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const validated = embedOptionsSchema.parse(options);

    const requestBody = {
      model: validated.model,
      input: validated.input,
    };

    const response = await this.http.post<EmbeddingsResponse>(
      "/internal/embeddings",
      requestBody
    );

    return {
      embeddings: response.data.map((d) => d.embedding),
      usage: {
        totalTokens: response.usage.totalTokens,
      },
    };
  }

  // ── Structured Object ─────────────────────────────────────────────────

  /**
   * Generates a structured object based on the provided schema.
   * Retries on transient errors and JSON parse failures up to maxRetries.
   * @param options - Object generation options including schema.
   * @returns The parsed and validated object with usage stats.
   * @throws FrontalError on non-retryable API errors, Error on exhausted retries.
   */
  async generateObject<T>(
    options: GenerateObjectOptions<T>
  ): Promise<GenerateObjectResult<T>> {
    const { schema, prompt, model, temperature, maxRetries } = options;

    const attempts = (maxRetries ?? 0) + 1;
    let lastError: Error | null = null;

    const systemInstruction = `You are a helpful assistant designed to output JSON. The JSON must strictly follow this schema description: ${JSON.stringify(schema)}`;
    const messages: ChatMessage[] = [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt },
    ];

    const requestBody: ChatCompletionRequest = {
      model,
      messages,
      temperature,
      responseFormat: { type: "json_object" },
    };

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }

      try {
        const response = await this.http.post<ChatCompletionResponse>(
          "/ai/chat/completions",
          requestBody
        );

        const content = response.choices[0].message.content;
        if (!content) {
          lastError = new Error("No content generated");
          continue;
        }

        let object: T;
        try {
          object = JSON.parse(content);
          if (schema instanceof z.ZodType) {
            object = schema.parse(object);
          }
        } catch {
          lastError = new Error("Failed to parse or validate JSON");
          continue;
        }

        return {
          object,
          usage: {
            promptTokens: response.usage?.promptTokens || 0,
            completionTokens: response.usage?.completionTokens || 0,
            totalTokens: response.usage?.totalTokens || 0,
          },
        };
      } catch (err) {
        if (err instanceof FrontalError) {
          const retryable = err.statusCode >= 500 || err.statusCode === 429;
          if (!retryable) {
            throw err;
          }
          lastError = err;
          continue;
        }
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError ?? new Error("generateObject failed after retries");
  }

  // ── Speech ────────────────────────────────────────────────────────────

  /**
   * Generates speech from text.
   * @param options - Speech generation options.
   * @returns The audio data as an ArrayBuffer.
   * @throws FrontalError on API errors.
   */
  async generateSpeech(options: GenerateSpeechOptions): Promise<ArrayBuffer> {
    const validated = generateSpeechOptionsSchema.parse(options);

    const body = {
      model: validated.model || "tts-1",
      input: validated.text,
      voice: validated.voice,
      speed: validated.speed,
      responseFormat: validated.format,
    };

    const response = await this.http.postRaw("/internal/predictions", body);
    return response.arrayBuffer();
  }

  // ── Image ─────────────────────────────────────────────────────────────

  /**
   * Generates an image from a prompt.
   * @param options - Image generation options.
   * @returns The generated image result.
   * @throws FrontalError on API errors.
   */
  async generateImage(
    options: GenerateImageOptions
  ): Promise<GenerateImageResult> {
    const validated = generateImageOptionsSchema.parse(options);

    const requestBody = {
      prompt: validated.prompt,
      model: validated.model || "dall-e-3",
      n: validated.n || 1,
      size: validated.size || "1024x1024",
      quality: validated.quality,
      style: validated.style,
      responseFormat: "url",
    };

    const response = await this.http.post<{
      data: { url?: string; b64Json?: string }[];
    }>("/internal/predictions", requestBody);

    return {
      images: response.data.map((img) => ({
        url: img.url,
        b64Json: img.b64Json,
      })),
    };
  }

  // ── Video ─────────────────────────────────────────────────────────────

  /**
   * Generates a video from a prompt.
   * @param options - Video generation options.
   * @returns The generated video result.
   * @throws FrontalError on API errors.
   */
  async generateVideo(
    options: GenerateVideoOptions
  ): Promise<GenerateVideoResult> {
    const validated = generateVideoOptionsSchema.parse(options);
    return this.http.post<GenerateVideoResult>(
      "/internal/predictions",
      validated
    );
  }

  // ── Transcription ─────────────────────────────────────────────────────

  /**
   * Transcribes audio to text.
   * @param options - Transcription options including the audio file.
   * @returns The transcription result.
   * @throws FrontalError on API errors.
   */
  async transcribe(
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const validated = transcriptionOptionsSchema.parse(options);

    const formData = new FormData();
    formData.append("file", validated.file);
    formData.append("model", validated.model);
    if (validated.language) formData.append("language", validated.language);
    if (validated.prompt) formData.append("prompt", validated.prompt);
    if (validated.responseFormat)
      formData.append("response_format", validated.responseFormat);
    if (validated.temperature)
      formData.append("temperature", String(validated.temperature));

    return this.http.postFormData<TranscriptionResult>(
      "/internal/predictions",
      formData
    );
  }

  // ── Moderation ────────────────────────────────────────────────────────

  /**
   * Moderates content for policy violations.
   * @param options - Moderation options.
   * @returns The moderation result.
   * @throws FrontalError on API errors.
   */
  async moderate(options: ModerationOptions): Promise<ModerationResult> {
    const validated = moderationOptionsSchema.parse(options);
    const requestBody = {
      input: validated.input,
      model: validated.model || "text-moderation-latest",
    };
    return this.http.post<ModerationResult>(
      "/internal/predictions",
      requestBody
    );
  }

  // ── Models ────────────────────────────────────────────────────────────

  /**
   * Lists available models in the Frontal AI Gateway.
   * @returns Array of model ID strings.
   * @throws FrontalError on API errors.
   */
  async listModels(): Promise<string[]> {
    const response = await this.http.get<unknown>("/internal/models");

    if (
      response &&
      typeof response === "object" &&
      "data" in response &&
      Array.isArray((response as Record<string, unknown>).data)
    ) {
      const data = (response as Record<string, unknown>).data as Record<
        string,
        unknown
      >[];
      if (data.length > 0 && typeof data[0].id === "string") {
        return data.map((m) => m.id as string);
      }
    }

    if (Array.isArray(response)) {
      return response as string[];
    }

    return [];
  }

  /**
   * Returns the gateway's default model ids per capability
   * (e.g. chat, reranking, embedding).
   */
  async getDefaultModels(): Promise<Record<string, string>> {
    return this.http.get<Record<string, string>>("/internal/models/defaults");
  }

  /**
   * Reranks `documents` by relevance to `query` using a reranking model.
   * Returns one score per input document, in input order.
   *
   * @param options.model - Reranking model id (see {@link getDefaultModels}).
   * @param options.query - The query to score documents against.
   * @param options.documents - Documents as plain strings or rich objects.
   * @param options.topK - Optionally keep only the top-K documents.
   * @param options.criteria - Optional natural-language relevance criteria.
   */
  async rerank(options: {
    model: string;
    query: string;
    documents: Array<
      | string
      | {
          content: string;
          sourcePath?: string;
          chunkIndex?: number;
          metadata?: Record<string, string>;
        }
    >;
    topK?: number;
    criteria?: string;
  }): Promise<{ scores: number[]; usage?: unknown }> {
    const documents = options.documents.map((doc) =>
      typeof doc === "string" ? { content: doc } : doc
    );
    return this.http.post<{ scores: number[]; usage?: unknown }>(
      "/internal/rerank",
      {
        model: options.model,
        query: options.query,
        documents,
        topK: options.topK,
        criteria: options.criteria,
      }
    );
  }

  /** Health check for the AI gateway. */
  async health(): Promise<{ status: string } & Record<string, unknown>> {
    return this.http.get<{ status: string } & Record<string, unknown>>(
      "/health"
    );
  }

  // ── Utility Methods ──────────────────────────────────────────────────

  /**
   * Roughly estimates the number of tokens in a text string.
   * Uses a simple heuristic: 1 token ~= 4 characters.
   */
  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimates the cost of a generation.
   * This is a placeholder as cost depends on model-specific pricing.
   */
  estimateCost(options: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  }): number {
    const rates: Record<string, { input: number; output: number }> = {
      "frontal-ai-fast": { input: 0.000_001, output: 0.000_002 },
      default: { input: 0.000_01, output: 0.000_03 },
    };
    const rate = rates[options.model] || rates.default;
    return (
      options.inputTokens * rate.input + options.outputTokens * rate.output
    );
  }

  // ── Step Tracking ────────────────────────────────────────────────────

  private currentStep = 0;

  /**
   * Sets the current step count for tracking progress.
   * @param count - The step count value.
   */
  stepCountIs(count: number): void {
    this.currentStep = count;
  }

  /**
   * Returns the current step count.
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Resets the step counter to zero.
   */
  resetSteps(): void {
    this.currentStep = 0;
  }

  // ── Prompt Management ────────────────────────────────────────────────

  private prompts: Map<string, Prompt> = new Map();

  /**
   * Creates and registers a prompt template.
   * @param options - Prompt definition.
   * @returns The created prompt.
   */
  createPrompt(options: {
    name: string;
    template: string;
    variables: Record<string, VariableDefinition>;
    metadata?: Record<string, unknown>;
  }): Prompt {
    const prompt: Prompt = {
      ...options,
      version: "1.0.0",
    };
    this.prompts.set(options.name, prompt);
    return prompt;
  }

  /**
   * Retrieves a prompt by name.
   * @param name - The prompt name.
   * @param version - Optional version filter.
   * @returns The prompt.
   * @throws Error if the prompt is not found.
   */
  getPrompt(name: string, version?: string): Prompt {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    if (version && prompt.version !== version) {
      console.warn(`Requested version ${version} but found ${prompt.version}`);
    }
    return prompt;
  }

  /**
   * Updates an existing prompt.
   * @param name - The prompt name.
   * @param updates - Partial prompt fields to update.
   * @returns The updated prompt.
   * @throws Error if the prompt is not found.
   */
  updatePrompt(name: string, updates: Partial<Prompt>): Prompt {
    const prompt = this.getPrompt(name);
    const updatedPrompt = { ...prompt, ...updates };
    this.prompts.set(name, updatedPrompt);
    return updatedPrompt;
  }

  /**
   * Chains multiple prompts together.
   * @param prompts - The prompts to chain.
   * @returns A PromptChain.
   */
  chainPrompts(...prompts: Prompt[]): PromptChain {
    return { prompts };
  }

  // ── Tool System (legacy) ─────────────────────────────────────────────
  //
  // These methods keep an in-memory registry that is never sent to the
  // model. Prefer `tool()` from "@frontal-labs/ai" and pass `tools` to
  // `generateText` / `streamText`.

  private tools: Map<string, Tool> = new Map();

  /**
   * Defines a tool (does not register it).
   * @deprecated Use `tool({ description, inputSchema, execute })` and pass
   * it in `generateText({ tools })`.
   * @param options - Tool definition.
   * @returns The tool definition.
   */
  defineTool<TParams, TResult>(options: {
    name: string;
    description: string;
    parameters: z.ZodSchema<TParams> | Record<string, unknown>;
    execute: (params: TParams) => Promise<TResult>;
  }): Tool<TParams, TResult> {
    return options;
  }

  /**
   * Registers a tool for later execution.
   * @deprecated Pass `tools` to `generateText` / `streamText` instead.
   * @param tool - The tool to register.
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Returns all registered tools.
   * @deprecated See {@link AISdk.registerTool}.
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a registered tool by name.
   * @deprecated Run `tools[name].execute(parseToolInput(tools, name, input))`
   * on the `toolCalls` you get back from `generateText`.
   * @param name - The tool name.
   * @param params - Parameters to pass to the tool.
   * @returns The tool execution result.
   * @throws Error if the tool is not found or execution fails.
   */
  async executeTool(name: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    let result: unknown;
    if (tool.parameters instanceof z.ZodType) {
      const validatedParams = tool.parameters.parse(params);
      result = await tool.execute(validatedParams);
    } else {
      result = await tool.execute(params);
    }
    return result;
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private buildMessages(
    options: GenerateTextOptions | StreamTextOptions
  ): ChatMessage[] {
    let messages: ChatMessage[] = [];
    if (typeof options.prompt === "string") {
      messages = [{ role: "user", content: options.prompt }];
    } else if (Array.isArray(options.prompt)) {
      messages = options.prompt;
    }
    if (options.messages) {
      messages = options.messages;
    }
    return messages;
  }
}

interface RawToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

/** Normalizes OpenAI-shaped `tool_calls` into {@link ToolCall}s. */
function parseToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawToolCall[]).map((call) => {
    const args = call.function?.arguments ?? "";
    let input: unknown = {};
    if (args) {
      try {
        input = JSON.parse(args);
      } catch {
        input = args;
      }
    }
    return { id: call.id, toolName: call.function?.name ?? "", input };
  });
}
