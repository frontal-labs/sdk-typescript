import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_DATA_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { DataSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface DataClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createDataClient(
  config: DataClientConfig | FrontalClient
): DataSdk;

export function createDataClient(
  clientOrConfig: FrontalClient | DataClientConfig
): DataSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new DataSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_DATA_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.NODE_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new DataSdk(http);
}

let _dataCache: DataSdk | undefined;

export const data = new Proxy<DataSdk>({} as DataSdk, {
  get(_t, prop) {
    if (!_dataCache) {
      _dataCache = createDataClient(getDefaultClient());
    }
    const inst = _dataCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
