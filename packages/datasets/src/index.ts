import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_DATASETS_BASE_URL, VERSION } from "./constants";
import { DatasetsService } from "./service";

export interface DatasetsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createDatasetsClient(client: FrontalClient): DatasetsService;
export function createDatasetsClient(
  config: DatasetsClientConfig
): DatasetsService;
export function createDatasetsClient(
  clientOrConfig: FrontalClient | DatasetsClientConfig
): DatasetsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new DatasetsService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_DATASETS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_DATASETS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new DatasetsService(http);
}

export const datasets = new DatasetsService(getDefaultClient()._http);

export { DEFAULT_DATASETS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { DatasetsService } from "./service";
