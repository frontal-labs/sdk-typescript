import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_VECTORS_BASE_URL, VERSION } from "./constants";
import { VectorsService } from "./service";

export interface VectorsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createVectorsClient(client: FrontalClient): VectorsService;
export function createVectorsClient(
  config: VectorsClientConfig
): VectorsService;
export function createVectorsClient(
  clientOrConfig: FrontalClient | VectorsClientConfig
): VectorsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new VectorsService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_VECTORS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_VECTORS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new VectorsService(http);
}

export const vectors = new VectorsService(getDefaultClient()._http);

export { DEFAULT_VECTORS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { VectorsService } from "./service";
