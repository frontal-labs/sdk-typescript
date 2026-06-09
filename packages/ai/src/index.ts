/**
 * @frontal-labs/ai
 *
 * A powerful, type-safe AI SDK for Frontal
 * Provides unified access to LLMs, embeddings, and more.
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { AIService } from "./service";
import { DEFAULT_AI_BASE_URL, VERSION } from "./constants";

/** Config for standalone usage without @frontal-labs/core */
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
  clientOrConfig: FrontalClient | AIClientConfig
): AIService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AIService(clientOrConfig.httpClient);
  }

  const baseUrl =
    clientOrConfig.baseUrl ??
    process.env.FRONTAL_AI_API_URL ??
    DEFAULT_AI_BASE_URL;

  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });

  return new AIService(http);
}

// Default instance that works automatically with environment variables
let _aiCache: AIService | undefined;
export const ai = new Proxy<AIService>({} as AIService, {
  get(_t, prop) {
    const inst = (_aiCache ??= createAIClient(getDefaultClient()));
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

// New Pattern B exports
export { AIService } from "./service";

export { DEFAULT_AI_BASE_URL, VERSION };
export type {
  AIConfig,
  APIResponse,
  EmbedOptions,
  EmbedResult,
  ErrorResponse,
  GenerateTextOptions,
  GenerateTextResult,
  Message,
  StreamTextOptions,
} from "./schemas";
