import {
  env,
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_FUNCTIONS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { FunctionsSdk } from "./sdk";

/**
 * Configuration for creating a standalone Frontal Functions client.
 */
export interface FunctionsClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Functions API. Defaults to {@link DEFAULT_FUNCTIONS_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link FunctionsSdk} client from a {@link FrontalClient} instance or
 * a {@link FunctionsClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `FunctionsSdk` instance.
 */
export function createFunctionsClient(
  config: FunctionsClientConfig | FrontalClient
): FunctionsSdk;

export function createFunctionsClient(
  clientOrConfig: FrontalClient | FunctionsClientConfig
): FunctionsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new FunctionsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_FUNCTIONS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new FunctionsSdk(http);
}

let _functionsCache: FunctionsSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Functions SDK.
 * Lazily initialises from environment variables on first property access.
 *
 * @deprecated Prefer `new Frontal({ apiKey })` so configuration is explicit
 * and testable. This export stays for back-compat and will not be removed
 * without a major version bump.
 */
export const functions = new Proxy<FunctionsSdk>({} as FunctionsSdk, {
  get(_t, prop) {
    if (!_functionsCache) {
      _functionsCache = createFunctionsClient(getDefaultClient());
    }
    const inst = _functionsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
