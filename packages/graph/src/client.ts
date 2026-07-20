import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_GRAPH_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { GraphSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface GraphClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

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
