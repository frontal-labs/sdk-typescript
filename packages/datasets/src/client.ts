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

/** Configuration options for creating a Datasets API client. */
export interface DatasetsClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Datasets API. Defaults to `DEFAULT_DATASETS_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create a Datasets SDK client.
 * @param config - Either a `FrontalClient` instance or a `DatasetsClientConfig` object.
 * @returns A configured `DatasetsSdk` instance.
 */
export function createDatasetsClient(
  config: DatasetsClientConfig | FrontalClient
): DatasetsSdk;

/**
 * Create a Datasets SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or a `DatasetsClientConfig` object.
 * @returns A configured `DatasetsSdk` instance.
 */
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

/**
 * Default singleton Datasets SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
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
