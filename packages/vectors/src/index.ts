import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_VECTORS_BASE_URL } from "./constants";
import { VectorsService } from "./service";

export interface VectorsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createVectorsClient(
  config: VectorsClientConfig | FrontalClient
): VectorsService;
export function createVectorsClient(
  clientOrConfig: FrontalClient | VectorsClientConfig
): VectorsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new VectorsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_VECTORS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_VECTORS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new VectorsService(http);
}

let _vectorsCache: VectorsService | undefined;
export const vectors = new Proxy<VectorsService>({} as VectorsService, {
  get(_t, prop) {
    if (!_vectorsCache) {
      _vectorsCache = new VectorsService(getDefaultClient().httpClient);
    }
    const inst = _vectorsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_VECTORS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { VectorsService } from "./service";
