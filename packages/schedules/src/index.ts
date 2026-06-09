import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_SCHEDULES_BASE_URL, VERSION } from "./constants";
import { SchedulesService } from "./service";

export interface SchedulesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createSchedulesClient(client: FrontalClient): SchedulesService;
export function createSchedulesClient(
  config: SchedulesClientConfig
): SchedulesService;
export function createSchedulesClient(
  clientOrConfig: FrontalClient | SchedulesClientConfig
): SchedulesService {
  if (clientOrConfig instanceof FrontalClient) {
    return new SchedulesService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_SCHEDULES_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_SCHEDULES_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new SchedulesService(http);
}

let _schedulesCache: SchedulesService | undefined;
export const schedules = new Proxy<SchedulesService>({} as SchedulesService, {
  get(_t, prop) {
    const inst = (_schedulesCache ??= new SchedulesService(
      getDefaultClient().httpClient
    ));
    const val = (inst as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_SCHEDULES_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { validateCronLocal, nextCronRunsLocal } from "./cron";
export { SchedulesService } from "./service";
