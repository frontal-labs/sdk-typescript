import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_OBSERVABILITY_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { ObservabilitySdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for creating a standalone Frontal Observability client.
 */
export interface ObservabilityClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Observability API. Defaults to {@link DEFAULT_OBSERVABILITY_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates an {@link ObservabilitySdk} client from a {@link FrontalClient}
 * instance or an {@link ObservabilityClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `ObservabilitySdk` instance.
 */
export function createObservabilityClient(
  config: ObservabilityClientConfig | FrontalClient
): ObservabilitySdk;

export function createObservabilityClient(
  clientOrConfig: FrontalClient | ObservabilityClientConfig
): ObservabilitySdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new ObservabilitySdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_OBSERVABILITY_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new ObservabilitySdk(http);
}

let _observabilityCache: ObservabilitySdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Observability SDK.
 * Lazily initialises from environment variables on first property access.
 */
export const observability = new Proxy<ObservabilitySdk>(
  {} as ObservabilitySdk,
  {
    get(_t, prop) {
      if (!_observabilityCache) {
        _observabilityCache = createObservabilityClient(getDefaultClient());
      }
      const inst = _observabilityCache;
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);
