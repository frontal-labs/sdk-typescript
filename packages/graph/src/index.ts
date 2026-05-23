import { FrontalClient, getDefaultClient, HttpClient } from "@frontal/core";
import { GraphService } from "./service";

/** Config for standalone usage without @frontal/core */
export interface GraphClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createGraphClient(client: FrontalClient): GraphService;
/** Create standalone with just config */
export function createGraphClient(config: GraphClientConfig): GraphService;
export function createGraphClient(
  clientOrConfig: FrontalClient | GraphClientConfig
): GraphService {
  if (clientOrConfig instanceof FrontalClient) {
    return new GraphService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_GRAPH_API_URL ??
      process.env.FRONTAL_API_URL ??
      "https://api.frontal.dev/v1",
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new GraphService(http);
}

// Default instance that works automatically with environment variables
export const graph = new GraphService(getDefaultClient()._http);

export * from "./schemas";
export { GraphService } from "./service";
