import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_DATA_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { DataSdk } from "./sdk";
import { env } from "frontal/core";

/**
 * Configuration for creating a standalone Frontal Data client.
 */
export interface DataClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Data API. Defaults to {@link DEFAULT_DATA_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link DataSdk} client from a {@link FrontalClient} instance or a
 * {@link DataClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `DataSdk` instance.
 */
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
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new DataSdk(http);
}

let _dataCache: DataSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Data SDK.
 * Lazily initialises from environment variables on first property access.
 */
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
