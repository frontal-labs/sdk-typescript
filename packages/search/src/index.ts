import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_SEARCH_BASE_URL, VERSION } from "./constants";
import { SearchService } from "./service";

export interface SearchClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createSearchClient(client: FrontalClient): SearchService;
export function createSearchClient(config: SearchClientConfig): SearchService;
export function createSearchClient(
  clientOrConfig: FrontalClient | SearchClientConfig
): SearchService {
  if (clientOrConfig instanceof FrontalClient) {
    return new SearchService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_SEARCH_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_SEARCH_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new SearchService(http);
}

export const search = new SearchService(getDefaultClient()._http);

export { DEFAULT_SEARCH_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { SearchService, StatsNamespace } from "./service";
