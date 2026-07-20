import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_SCHEDULE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { SchedulesSdk } from "./sdk";
import { env } from "frontal/core";

/**
 * Configuration for creating a standalone Frontal Schedules client.
 */
export interface SchedulesClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Schedules API. Defaults to {@link DEFAULT_SCHEDULE_BASE_URL}. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: number;
  /** Maximum number of retries for failed requests. Defaults to {@link DEFAULT_MAX_RETRIES}. */
  maxRetries?: number;
}

/**
 * Creates a {@link SchedulesSdk} client from a {@link FrontalClient} instance
 * or a {@link SchedulesClientConfig} configuration object.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `SchedulesSdk` instance.
 */
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

/**
 * Convenience singleton proxy for the Frontal Schedules SDK.
 * Lazily initialises from environment variables on first property access.
 */
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
