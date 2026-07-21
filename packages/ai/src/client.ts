import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AISdk } from "./sdk";
import { env } from "@frontal-labs/core";

/**
 * Configuration for creating an {@link AISdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default AI gateway base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface AIClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates an {@link AISdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param clientOrConfig - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized AISdk.
 */
export function createAIClient(
  clientOrConfig: FrontalClient | AIClientConfig
): AISdk;
export function createAIClient(
  clientOrConfig: FrontalClient | AIClientConfig
): AISdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new AISdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_AI_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new AISdk(http);
}

let _aiCache: AISdk | undefined;

/**
 * Convenience singleton that lazily creates an {@link AISdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { ai } from "@frontal-labs/ai";
 * const result = await ai.generateText({ model: "gpt-4o-mini", prompt: "Hello" });
 * ```
 */
export const ai = new Proxy<AISdk>({} as AISdk, {
  get(_t, prop) {
    if (!_aiCache) {
      _aiCache = createAIClient(getDefaultClient());
    }
    const inst = _aiCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
