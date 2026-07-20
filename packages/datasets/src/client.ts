import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_DATASETS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { DatasetsSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface DatasetsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createDatasetsClient(
  config: DatasetsClientConfig | FrontalClient
): DatasetsSdk;

export function createDatasetsClient(
  clientOrConfig: FrontalClient | DatasetsClientConfig
): DatasetsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new DatasetsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_DATASETS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new DatasetsSdk(http);
}

let _datasetsCache: DatasetsSdk | undefined;

export const datasets = new Proxy<DatasetsSdk>({} as DatasetsSdk, {
  get(_t, prop) {
    if (!_datasetsCache) {
      _datasetsCache = createDatasetsClient(getDefaultClient());
    }
    const inst = _datasetsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
