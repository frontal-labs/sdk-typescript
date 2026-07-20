import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/_core";
import {
  DEFAULT_EVENTS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { EventsSdk } from "./sdk";
import { env } from "@frontal-labs/_core";

/** Configuration options for creating an Events API client. */
export interface EventsClientConfig {
  /** Frontal API key. */
  apiKey: string;
  /** Base URL for the Events API. Defaults to `DEFAULT_EVENTS_BASE_URL`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * Create an Events SDK client.
 * @param config - Either a `FrontalClient` instance or an `EventsClientConfig` object.
 * @returns A configured `EventsSdk` instance.
 */
export function createEventsClient(
  config: EventsClientConfig | FrontalClient
): EventsSdk;

/**
 * Create an Events SDK client.
 * @param clientOrConfig - Either a `FrontalClient` instance or an `EventsClientConfig` object.
 * @returns A configured `EventsSdk` instance.
 */
export function createEventsClient(
  clientOrConfig: FrontalClient | EventsClientConfig
): EventsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new EventsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_EVENTS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new EventsSdk(http);
}

let _eventsCache: EventsSdk | undefined;

/**
 * Default singleton Events SDK instance backed by the default {@link FrontalClient}.
 * Lazily initialized on first access.
 */
export const events = new Proxy<EventsSdk>({} as EventsSdk, {
  get(_t, prop) {
    if (!_eventsCache) {
      _eventsCache = createEventsClient(getDefaultClient());
    }
    const inst = _eventsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
