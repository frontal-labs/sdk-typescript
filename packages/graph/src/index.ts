import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { GraphService } from "./service";

/** Config for standalone usage without @frontal-labs/core */
export interface GraphClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
/** Create standalone with just config */
export function createGraphClient(
  config: GraphClientConfig | FrontalClient
): GraphService;
export function createGraphClient(
  clientOrConfig: FrontalClient | GraphClientConfig
): GraphService {
  if (clientOrConfig instanceof FrontalClient) {
    return new GraphService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_GRAPH_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new GraphService(http);
}

// Default instance that works automatically with environment variables
let _graphCache: GraphService | undefined;
export const graph = new Proxy<GraphService>({} as GraphService, {
  get(_t, prop) {
    if (!_graphCache) {
      _graphCache = new GraphService(getDefaultClient().httpClient);
    }
    const inst = _graphCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export * from "./schemas";
export { GraphService } from "./service";
