import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_WORKERS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { WorkersSdk } from "./sdk";
import { env } from "frontal/core";

/**
 * Configuration for creating a standalone Frontal Workers client.
 */
export interface WorkersClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Workers API. Defaults to {@link DEFAULT_WORKERS_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link WorkersSdk} client from a {@link FrontalClient} instance or
 * a {@link WorkersClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `WorkersSdk` instance.
 */
export function createWorkersClient(
  config: WorkersClientConfig | FrontalClient
): WorkersSdk;

export function createWorkersClient(
  clientOrConfig: FrontalClient | WorkersClientConfig
): WorkersSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new WorkersSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_WORKERS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new WorkersSdk(http);
}

let _workersCache: WorkersSdk | undefined;

/**
 * Convenience singleton proxy for the Frontal Workers SDK.
 * Lazily initialises from environment variables on first property access.
 */
export const workers = new Proxy<WorkersSdk>({} as WorkersSdk, {
  get(_t, prop) {
    if (!_workersCache) {
      _workersCache = createWorkersClient(getDefaultClient());
    }
    const inst = _workersCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
