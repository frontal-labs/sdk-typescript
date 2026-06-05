import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_LINEAGE_BASE_URL, VERSION } from "./constants";
import { LineageService } from "./service";

export interface LineageClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createLineageClient(client: FrontalClient): LineageService;
export function createLineageClient(
  config: LineageClientConfig
): LineageService;
export function createLineageClient(
  clientOrConfig: FrontalClient | LineageClientConfig
): LineageService {
  if (clientOrConfig instanceof FrontalClient) {
    return new LineageService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_LINEAGE_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_LINEAGE_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new LineageService(http);
}

export const lineage = new LineageService(getDefaultClient()._http);

export { DEFAULT_LINEAGE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { LineageService } from "./service";
