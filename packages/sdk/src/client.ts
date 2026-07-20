import { FrontalClient, getDefaultClient } from "@frontal-labs/core";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { Frontal } from "./sdk";
import { env } from "@frontal-labs/core";

/**
 * Configuration for standalone usage without a FrontalClient instance.
 */
export interface FrontalClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
/** Create standalone with config */
export function createFrontalClient(
  config: FrontalClientConfig | FrontalClient
): Frontal;

export function createFrontalClient(
  clientOrConfig: FrontalClient | FrontalClientConfig
): Frontal {
  if (clientOrConfig instanceof FrontalClient) {
    return new Frontal(clientOrConfig);
  }
  return new Frontal(
    new FrontalClient({
      apiKey: clientOrConfig.apiKey,
      baseUrl:
        clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_BASE_URL,
      timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
      headers: {},
      environment: env.FRONTAL_ENV,
      debug: env.FRONTAL_DEBUG ?? false,
    })
  );
}

/** Default Frontal SDK instance (reads FRONTAL_API_KEY from env) */
let _frontalCache: Frontal | undefined;

export const frontal = new Proxy<Frontal>({} as Frontal, {
  get(_t, prop) {
    if (!_frontalCache) {
      _frontalCache = createFrontalClient(getDefaultClient());
    }
    const inst = _frontalCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
