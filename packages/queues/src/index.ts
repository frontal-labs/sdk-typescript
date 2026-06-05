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

export function createQueuesClient(client: FrontalClient): QueuesService;
export function createQueuesClient(config: QueuesClientConfig): QueuesService;
export function createQueuesClient(
  clientOrConfig: FrontalClient | QueuesClientConfig
): QueuesService {
  if (clientOrConfig instanceof FrontalClient) {
    return new QueuesService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_QUEUES_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_QUEUES_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new QueuesService(http);
}

export const queues = new QueuesService(getDefaultClient()._http);

export { DEFAULT_QUEUES_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { QueuesService } from "./service";
