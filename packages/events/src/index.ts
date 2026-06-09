import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_EVENTS_BASE_URL, VERSION } from "./constants";
import { EventsService } from "./service";

export interface EventsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createEventsClient(client: FrontalClient): EventsService;
export function createEventsClient(config: EventsClientConfig): EventsService;
export function createEventsClient(
  clientOrConfig: FrontalClient | EventsClientConfig
): EventsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new EventsService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_EVENTS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_EVENTS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new EventsService(http);
}

let _eventsCache: EventsService | undefined;
export const events = new Proxy<EventsService>({} as EventsService, {
  get(_t, prop) {
    const inst = (_eventsCache ??= new EventsService(
      getDefaultClient().httpClient
    ));
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_EVENTS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { EventBuffer } from "./buffer";
export type { EventBufferConfig } from "./buffer";
export { EventsService } from "./service";
export {
  TopicsNamespace,
  SubscriptionsNamespace,
  DeadLetterNamespace,
  EventSchemasNamespace,
} from "./service";
