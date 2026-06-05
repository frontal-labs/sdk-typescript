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
    return new SchedulesService(clientOrConfig._http);
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

export const schedules = new SchedulesService(getDefaultClient()._http);

export { DEFAULT_SCHEDULES_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { validateCronLocal, nextCronRunsLocal } from "./cron";
export { SchedulesService } from "./service";
