import type { HttpClient } from "@frontal/core";
import { FrontalError } from "@frontal/core";
import {
	type EmbedOptions,
	embedOptionsSchema,
	type EmbeddingsResponse,
	type EmbedResult,
	type GenerateTextOptions,
	type GenerateTextResult,
	type StreamTextOptions,
	type StreamTextResult,
	type GenerateObjectOptions,
	type GenerateObjectResult,
	type GenerateSpeechOptions,
	generateSpeechOptionsSchema,
	type GenerateImageOptions,
	generateImageOptionsSchema,
	type GenerateImageResult,
	type GenerateVideoOptions,
	generateVideoOptionsSchema,
	type GenerateVideoResult,
	type TranscriptionOptions,
	transcriptionOptionsSchema,
	type TranscriptionResult,
	type ModerationOptions,
	moderationOptionsSchema,
	type ModerationResult,
	type Prompt,
	type PromptChain,
	type Tool,
	type VariableDefinition,
	type ChatMessage,
	type ChatCompletionRequest,
	type ChatCompletionResponse,
} from "./types";
import { z } from "zod";

/**
 * Service for interacting with Frontal AI.
 * Takes an HttpClient and returns data directly, throwing typed errors.
 *
 * @example
 * ```typescript
 * import { createAIClient } from '@frontal/ai'
 * import { FrontalClient } from '@frontal/core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const ai = createAIClient(client)
 * const result = await ai.generateText({ model: 'gpt-4o-mini', prompt: 'Hello' })
 * ```
 */
export class AIService {
	constructor(private readonly http: HttpClient) {}

	// ── Text Generation ─────────────────────────────────────────────────

	/**
	 * Generates text using a large language model.
	 * @param options - Text generation options.
	 * @returns The generation result.
	 * @throws FrontalError on API errors, ZodError on validation errors.
	 */
	async generateText(
		options: GenerateTextOptions,
	): Promise<GenerateTextResult> {
		const messages = this.buildMessages(options);

		const requestBody: ChatCompletionRequest = {
			model: options.model,
			messages,
			temperature: options.temperature,
			top_p: options.topP,
			frequency_penalty: options.frequencyPenalty,
			presence_penalty: options.presencePenalty,
			stop: options.stopSequences,
			max_tokens: options.maxTokens,
		};

		const response = await this.http.post<ChatCompletionResponse>(
			"/ai/chat/completions",
			requestBody,
		);

		const choice = response.choices[0];

		return {
			text: choice.message.content || "",
			finishReason:
				(choice.finish_reason as GenerateTextResult["finishReason"]) || "other",
			usage: {
				promptTokens: response.usage?.prompt_tokens || 0,
				completionTokens: response.usage?.completion_tokens || 0,
				totalTokens: response.usage?.total_tokens || 0,
			},
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
		const { onChunk } = options;

		const requestBody: ChatCompletionRequest = {
			model: options.model,
			messages,
			temperature: options.temperature,
			top_p: options.topP,
			frequency_penalty: options.frequencyPenalty,
			presence_penalty: options.presencePenalty,
			stop: options.stopSequences,
			max_tokens: options.maxTokens,
			stream: true,
		};

		let usageResolve!: (value: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		}) => void;
		const usagePromise = new Promise<{
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		}>((resolve) => {
			usageResolve = resolve;
		});

		const http = this.http;

		const textStream = new ReadableStream<string>({
			async start(controller) {
				try {
					for await (const event of http.postStream(
						"/ai/chat/completions",
						requestBody,
					)) {
						if (event.data === "[DONE]") {
							break;
						}
						const data = event.data as Record<string, unknown> | null;
						if (!data) continue;

						const choices = data.choices as
							| Array<{
									delta: { content?: string | null };
									finish_reason?: string | null;
							  }>
							| undefined;
						const content = choices?.[0]?.delta?.content;
						if (content) {
							if (onChunk) onChunk(content);
							controller.enqueue(content);
						}

						// Check for usage in the final chunk (some providers include it)
						const usage = data.usage as
							| {
									prompt_tokens?: number;
									completion_tokens?: number;
									total_tokens?: number;
							  }
							| undefined;
						if (usage) {
							usageResolve({
								promptTokens: usage.prompt_tokens || 0,
								completionTokens: usage.completion_tokens || 0,
								totalTokens: usage.total_tokens || 0,
							});
						}
					}
				} catch (error) {
					controller.error(
						error instanceof Error ? error : new Error(String(error)),
					);
				} finally {
					// Resolve usage with zeros if it was never set by the stream
					usageResolve({
						promptTokens: 0,
						completionTokens: 0,
						totalTokens: 0,
					});
					controller.close();
				}
			},
		});

		return { textStream, usage: usagePromise };
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
			"/ai/embeddings",
			requestBody,
		);

		return {
			embeddings: response.data.map((d) => d.embedding),
			usage: {
				totalTokens: response.usage.total_tokens,
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
		options: GenerateObjectOptions<T>,
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
			response_format: { type: "json_object" },
		};

		for (let attempt = 0; attempt < attempts; attempt++) {
			if (attempt > 0) {
				await new Promise((r) => setTimeout(r, 500));
			}

			try {
				const response = await this.http.post<ChatCompletionResponse>(
					"/ai/chat/completions",
					requestBody,
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
						promptTokens: response.usage?.prompt_tokens || 0,
						completionTokens: response.usage?.completion_tokens || 0,
						totalTokens: response.usage?.total_tokens || 0,
					},
				};
			} catch (err) {
				// On FrontalError, only retry if transient (5xx or 429)
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

		// Retries exhausted — throw the last error
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
			response_format: validated.format,
		};

		const response = await this.http.postRaw("/ai/audio/speech", body);
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
		options: GenerateImageOptions,
	): Promise<GenerateImageResult> {
		const validated = generateImageOptionsSchema.parse(options);

		const requestBody = {
			prompt: validated.prompt,
			model: validated.model || "dall-e-3",
			n: validated.n || 1,
			size: validated.size || "1024x1024",
			quality: validated.quality,
			style: validated.style,
			response_format: "url",
		};

		const response = await this.http.post<{
			data: Array<{ url?: string; b64_json?: string }>;
		}>("/ai/images/generations", requestBody);

		return {
			images: response.data.map((img) => ({
				url: img.url,
				b64_json: img.b64_json,
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
		options: GenerateVideoOptions,
	): Promise<GenerateVideoResult> {
		const validated = generateVideoOptionsSchema.parse(options);
		return this.http.post<GenerateVideoResult>(
			"/ai/videos/generate",
			validated,
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
		options: TranscriptionOptions,
	): Promise<TranscriptionResult> {
		const validated = transcriptionOptionsSchema.parse(options);

		const formData = new FormData();
		formData.append("file", validated.file);
		formData.append("model", validated.model);
		if (validated.language) formData.append("language", validated.language);
		if (validated.prompt) formData.append("prompt", validated.prompt);
		if (validated.response_format)
			formData.append("response_format", validated.response_format);
		if (validated.temperature)
			formData.append("temperature", String(validated.temperature));

		return this.http.postFormData<TranscriptionResult>(
			"/audio/transcriptions",
			formData,
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
		return this.http.post<ModerationResult>("/ai/moderations", requestBody);
	}

	// ── Models ────────────────────────────────────────────────────────────

	/**
	 * Lists available models in the Frontal AI Gateway.
	 * @returns Array of model ID strings.
	 * @throws FrontalError on API errors.
	 */
	async listModels(): Promise<string[]> {
		const response = await this.http.get<unknown>("/ai/models");

		// Handle OpenAI format { object: "list", data: [{ id: "..." }] }
		if (
			response &&
			typeof response === "object" &&
			"data" in response &&
			Array.isArray((response as Record<string, unknown>).data)
		) {
			const data = (response as Record<string, unknown>).data as Array<
				Record<string, unknown>
			>;
			// Check if items have an id field (OpenAI format)
			if (data.length > 0 && typeof data[0].id === "string") {
				return data.map((m) => m.id as string);
			}
		}

		// Fallback for simple arrays
		if (Array.isArray(response)) {
			return response as string[];
		}

		return [];
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
			"frontal-ai-fast": { input: 0.000001, output: 0.000002 },
			default: { input: 0.00001, output: 0.00003 },
		};
		const rate = rates[options.model] || rates.default;
		return (
			options.inputTokens * rate.input + options.outputTokens * rate.output
		);
	}

	// ── Step Tracking ────────────────────────────────────────────────────

	private currentStep = 0;

	stepCountIs(count: number): void {
		this.currentStep = count;
	}

	getCurrentStep(): number {
		return this.currentStep;
	}

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

	// ── Tool System ──────────────────────────────────────────────────────

	private tools: Map<string, Tool> = new Map();

	/**
	 * Defines a tool (does not register it).
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
	 */
	getTools(): Tool[] {
		return Array.from(this.tools.values());
	}

	/**
	 * Executes a registered tool by name.
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
		options: GenerateTextOptions | StreamTextOptions,
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
