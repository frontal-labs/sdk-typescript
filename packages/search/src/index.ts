import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_SEARCH_BASE_URL } from "./constants";
import { SearchService } from "./service";

export interface SearchClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createSearchClient(
  config: SearchClientConfig | FrontalClient
): SearchService;
export function createSearchClient(
  clientOrConfig: FrontalClient | SearchClientConfig
): SearchService {
  if (clientOrConfig instanceof FrontalClient) {
    return new SearchService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_SEARCH_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_SEARCH_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new SearchService(http);
}

let _searchCache: SearchService | undefined;
export const search = new Proxy<SearchService>({} as SearchService, {
  get(_t, prop) {
    if (!_searchCache) {
      _searchCache = new SearchService(getDefaultClient().httpClient);
    }
    const inst = _searchCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_SEARCH_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { SearchService, StatsNamespace } from "./service";
