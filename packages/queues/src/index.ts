import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_QUEUES_BASE_URL } from "./constants";
import { QueuesService } from "./service";

export interface QueuesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createQueuesClient(
  config: QueuesClientConfig | FrontalClient
): QueuesService;
export function createQueuesClient(
  clientOrConfig: FrontalClient | QueuesClientConfig
): QueuesService {
  if (clientOrConfig instanceof FrontalClient) {
    return new QueuesService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_QUEUES_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_QUEUES_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new QueuesService(http);
}

let _queuesCache: QueuesService | undefined;
export const queues = new Proxy<QueuesService>({} as QueuesService, {
  get(_t, prop) {
    if (!_queuesCache) {
      _queuesCache = new QueuesService(getDefaultClient().httpClient);
    }
    const inst = _queuesCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_QUEUES_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { QueuesService } from "./service";
