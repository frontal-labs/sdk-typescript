import { FrontalClient, getDefaultClient } from "@frontal/core";
import type { z } from "zod";
import { AIService } from "./client";
import { DEFAULT_AI_BASE_URL } from "./constants";
import type {
	APIResponse,
	EmbedOptions,
	EmbedResult,
	GenerateImageOptions,
	GenerateImageResult,
	GenerateObjectOptions,
	GenerateObjectResult,
	GenerateSpeechOptions,
	GenerateTextOptions,
	GenerateTextResult,
	GenerateVideoOptions,
	GenerateVideoResult,
	IAIClient,
	ModerationOptions,
	ModerationResult,
	Prompt,
	PromptChain,
	StreamTextOptions,
	StreamTextResult,
	Tool,
	TranscriptionOptions,
	TranscriptionResult,
	VariableDefinition,
} from "./types";

function toErrorResponse(error: unknown): APIResponse<never>["error"] {
	if (error instanceof Error) {
		const errorWithStatus = error as Error & { statusCode?: number };
		const statusCode =
			typeof errorWithStatus.statusCode === "number"
				? errorWithStatus.statusCode
				: 0;
		return {
			message: error.message,
			statusCode,
			name: error.name || "application_error",
		};
	}
	return {
		message: "Unknown error",
		statusCode: 0,
		name: "application_error",
	};
}

/**
 * @deprecated Use `AIService` with `HttpClient` instead.
 * This class wraps AIService to provide backward-compatible
 * APIResponse<T> return types.
 */
export class AI implements IAIClient {
	private readonly service: AIService;

	constructor(config: { apiKey?: string; baseUrl?: string } = {}) {
		let client: FrontalClient;
		if (config.apiKey || config.baseUrl) {
			client = new FrontalClient({
				apiKey: config.apiKey || "",
				baseUrl: config.baseUrl || DEFAULT_AI_BASE_URL,
			});
		} else {
			client = getDefaultClient();
		}
		this.service = new AIService(client._http);
	}

	async generateText(
		options: GenerateTextOptions,
	): Promise<APIResponse<GenerateTextResult>> {
		try {
			const data = await this.service.generateText(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	streamText(options: StreamTextOptions): StreamTextResult {
		return this.service.streamText(options);
	}

	async embed(options: EmbedOptions): Promise<APIResponse<EmbedResult>> {
		try {
			const data = await this.service.embed(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async generateObject<T>(
		options: GenerateObjectOptions<T>,
	): Promise<APIResponse<GenerateObjectResult<T>>> {
		try {
			const data = await this.service.generateObject(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async generateSpeech(
		options: GenerateSpeechOptions,
	): Promise<APIResponse<ArrayBuffer>> {
		try {
			const data = await this.service.generateSpeech(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async generateImage(
		options: GenerateImageOptions,
	): Promise<APIResponse<GenerateImageResult>> {
		try {
			const data = await this.service.generateImage(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async generateVideo(
		options: GenerateVideoOptions,
	): Promise<APIResponse<GenerateVideoResult>> {
		try {
			const data = await this.service.generateVideo(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async transcribe(
		options: TranscriptionOptions,
	): Promise<APIResponse<TranscriptionResult>> {
		try {
			const data = await this.service.transcribe(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async moderate(
		options: ModerationOptions,
	): Promise<APIResponse<ModerationResult>> {
		try {
			const data = await this.service.moderate(options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	async listModels(): Promise<APIResponse<string[]>> {
		try {
			const data = await this.service.listModels();
			return { data, error: null, headers: {} };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	// Sync utility methods — delegate directly

	countTokens(text: string): number {
		return this.service.countTokens(text);
	}

	estimateCost(options: {
		model: string;
		inputTokens: number;
		outputTokens: number;
	}): number {
		return this.service.estimateCost(options);
	}

	// Step tracking — delegate directly

	stepCountIs(count: number): void {
		this.service.stepCountIs(count);
	}

	getCurrentStep(): number {
		return this.service.getCurrentStep();
	}

	resetSteps(): void {
		this.service.resetSteps();
	}

	// Prompt management — wrap in APIResponse

	createPrompt(options: {
		name: string;
		template: string;
		variables: Record<string, VariableDefinition>;
		metadata?: Record<string, unknown>;
	}): Prompt {
		return this.service.createPrompt(options);
	}

	getPrompt(name: string, version?: string): APIResponse<Prompt> {
		try {
			const data = this.service.getPrompt(name, version);
			return { data, error: null, headers: null };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	updatePrompt(name: string, updates: Partial<Prompt>): APIResponse<Prompt> {
		try {
			const data = this.service.updatePrompt(name, updates);
			return { data, error: null, headers: null };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}

	chainPrompts(...prompts: Prompt[]): PromptChain {
		return this.service.chainPrompts(...prompts);
	}

	// Tool system — delegate directly for sync, wrap async

	defineTool<TParams, TResult>(options: {
		name: string;
		description: string;
		parameters: z.ZodSchema<TParams> | Record<string, unknown>;
		execute: (params: TParams) => Promise<TResult>;
	}): Tool<TParams, TResult> {
		return this.service.defineTool(options);
	}

	registerTool(tool: Tool): void {
		this.service.registerTool(tool);
	}

	getTools(): Tool[] {
		return this.service.getTools();
	}

	async executeTool(
		name: string,
		params: unknown,
	): Promise<APIResponse<unknown>> {
		try {
			const data = await this.service.executeTool(name, params);
			return { data, error: null, headers: null };
		} catch (error) {
			return { data: null, error: toErrorResponse(error), headers: null };
		}
	}
}
