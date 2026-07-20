import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_WORKERS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { WorkersSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface WorkersClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

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
    environment: env.NODE_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new WorkersSdk(http);
}

let _workersCache: WorkersSdk | undefined;

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
