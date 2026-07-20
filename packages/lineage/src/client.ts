import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_LINEAGE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { LineageSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for creating a standalone Frontal Lineage client.
 */
export interface LineageClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Lineage API. Defaults to {@link DEFAULT_LINEAGE_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link LineageSdk} client from a {@link FrontalClient} instance or
 * a {@link LineageClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `LineageSdk` instance.
 */
export function createLineageClient(
  config: LineageClientConfig | FrontalClient
): LineageSdk;

export function createLineageClient(
  clientOrConfig: FrontalClient | LineageClientConfig
): LineageSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new LineageSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_LINEAGE_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new LineageSdk(http);
}

let _lineageCache: LineageSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Lineage SDK.
 * Lazily initialises from environment variables on first property access.
 */
export const lineage = new Proxy<LineageSdk>({} as LineageSdk, {
  get(_t, prop) {
    if (!_lineageCache) {
      _lineageCache = createLineageClient(getDefaultClient());
    }
    const inst = _lineageCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
