import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_SCHEDULE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { SchedulesSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface SchedulesClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createSchedulesClient(
  config: SchedulesClientConfig | FrontalClient
): SchedulesSdk;

export function createSchedulesClient(
  clientOrConfig: FrontalClient | SchedulesClientConfig
): SchedulesSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new SchedulesSdk(clientOrConfig.httpClient);
  }

  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_SCHEDULE_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });

  return new SchedulesSdk(http);
}

let _schedulesCache: SchedulesSdk | undefined;

export const schedules = new Proxy<SchedulesSdk>({} as SchedulesSdk, {
  get(_t, prop) {
    if (!_schedulesCache) {
      _schedulesCache = new SchedulesSdk(getDefaultClient().httpClient);
    }
    const inst = _schedulesCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
