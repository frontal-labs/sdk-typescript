import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_OBSERVABILITY_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { ObservabilitySdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface ObservabilityClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createObservabilityClient(
  config: ObservabilityClientConfig | FrontalClient
): ObservabilitySdk;

export function createObservabilityClient(
  clientOrConfig: FrontalClient | ObservabilityClientConfig
): ObservabilitySdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new ObservabilitySdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_OBSERVABILITY_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new ObservabilitySdk(http);
}

let _observabilityCache: ObservabilitySdk | undefined;

export const observability = new Proxy<ObservabilitySdk>(
  {} as ObservabilitySdk,
  {
    get(_t, prop) {
      if (!_observabilityCache) {
        _observabilityCache = createObservabilityClient(getDefaultClient());
      }
      const inst = _observabilityCache;
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);
