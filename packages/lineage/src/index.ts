import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_LINEAGE_BASE_URL } from "./constants";
import { LineageService } from "./service";

export interface LineageClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createLineageClient(
  config: LineageClientConfig | FrontalClient
): LineageService;
export function createLineageClient(
  clientOrConfig: FrontalClient | LineageClientConfig
): LineageService {
  if (clientOrConfig instanceof FrontalClient) {
    return new LineageService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_LINEAGE_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_LINEAGE_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new LineageService(http);
}

let _lineageCache: LineageService | undefined;
export const lineage = new Proxy<LineageService>({} as LineageService, {
  get(_t, prop) {
    if (!_lineageCache) {
      _lineageCache = new LineageService(getDefaultClient().httpClient);
    }
    const inst = _lineageCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_LINEAGE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { LineageService } from "./service";
