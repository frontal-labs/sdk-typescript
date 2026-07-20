import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_GRAPH_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { GraphSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/**
 * Configuration for creating a {@link GraphSdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default graph API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface GraphClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates a {@link GraphSdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param config - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized GraphSdk.
 */
export function createGraphClient(
  config: GraphClientConfig | FrontalClient
): GraphSdk;

export function createGraphClient(
  clientOrConfig: FrontalClient | GraphClientConfig
): GraphSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new GraphSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_GRAPH_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new GraphSdk(http);
}

let _graphCache: GraphSdk | undefined;

/**
 * Convenience singleton that lazily creates a {@link GraphSdk} using the
 * default environment configuration.
 *
 * @example
 * ```ts
 * import { graph } from "@frontal-labs/graph";
 * const result = await graph.query({ entityType: "user" });
 * ```
 */
export const graph = new Proxy<GraphSdk>({} as GraphSdk, {
  get(_t, prop) {
    if (!_graphCache) {
      _graphCache = createGraphClient(getDefaultClient());
    }
    const inst = _graphCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
