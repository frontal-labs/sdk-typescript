import { FrontalClient, getDefaultClient } from "@frontal-labs/_core";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { Frontal } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for standalone usage without a FrontalClient instance.
 */
export interface FrontalClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the API. Defaults to {@link DEFAULT_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a unified {@link Frontal} SDK client from a {@link FrontalClient}
 * instance or a {@link FrontalClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `Frontal` client with access to all service namespaces.
 */
export function createFrontalClient(
  config: FrontalClientConfig | FrontalClient
): Frontal;

export function createFrontalClient(
  clientOrConfig: FrontalClient | FrontalClientConfig
): Frontal {
  if (clientOrConfig instanceof FrontalClient) {
    return new Frontal(clientOrConfig);
  }
  return new Frontal(
    new FrontalClient({
      apiKey: clientOrConfig.apiKey,
      baseUrl:
        clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_BASE_URL,
      timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
      headers: {},
      environment: env.FRONTAL_ENV,
      debug: env.FRONTAL_DEBUG ?? false,
    })
  );
}

/**
 * Convenience singleton proxy for the unified Frontal SDK.
 * Lazily initialises from environment variables on first property access.
 * Provides access to all Frontal service namespaces as lazy getters.
 */
let _frontalCache: Frontal | undefined;

export const frontal = new Proxy<Frontal>({} as Frontal, {
  get(_t, prop) {
    if (!_frontalCache) {
      _frontalCache = createFrontalClient(getDefaultClient());
    }
    const inst = _frontalCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
