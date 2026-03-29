/**
 * @frontal/ai
 *
 * A powerful, type-safe AI SDK for Frontal
 * Provides unified access to LLMs, embeddings, and more.
 */

import { FrontalClient, HttpClient, getDefaultClient } from "@frontal/core";
import { AIService } from "./client";

/** Config for standalone usage without @frontal/core */
export interface AIClientConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createAIClient(client: FrontalClient): AIService;
/** Create standalone with just config */
export function createAIClient(config: AIClientConfig): AIService;
export function createAIClient(
	clientOrConfig: FrontalClient | AIClientConfig,
): AIService {
	if (clientOrConfig instanceof FrontalClient) {
		return new AIService(clientOrConfig._http);
	}
	const http = new HttpClient({
		apiKey: clientOrConfig.apiKey,
		baseUrl: clientOrConfig.baseUrl ?? "https://api.frontal.dev/v1",
		timeout: clientOrConfig.timeout ?? 30000,
		maxRetries: clientOrConfig.maxRetries ?? 3,
		retryDelay: 1000,
		headers: {},
		environment: "production",
		debug: false,
	});
	return new AIService(http);
}

// Default instance
export const ai = createAIClient(getDefaultClient());

// New Pattern B exports
export { AIService } from "./client";

// Deprecated Pattern A compat
export { AI } from "./compat";

export { VERSION, DEFAULT_AI_BASE_URL } from "./constants";
export type {
	Message,
	GenerateTextOptions,
	GenerateTextResult,
	StreamTextOptions,
	EmbedOptions,
	EmbedResult,
	AIConfig,
	APIResponse,
	ErrorResponse,
} from "./types";
