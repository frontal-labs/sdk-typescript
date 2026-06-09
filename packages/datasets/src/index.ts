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
    return new DatasetsService(clientOrConfig.httpClient);
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

let _datasetsCache: DatasetsService | undefined;
export const datasets = new Proxy<DatasetsService>({} as DatasetsService, {
  get(_t, prop) {
    const inst = (_datasetsCache ??= new DatasetsService(
      getDefaultClient().httpClient
    ));
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_DATASETS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { DatasetsService } from "./service";
