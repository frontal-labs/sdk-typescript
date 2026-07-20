import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_GOVERNANCE_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { GovernanceSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface GovernanceClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createGovernanceClient(
  config: GovernanceClientConfig | FrontalClient
): GovernanceSdk;

export function createGovernanceClient(
  clientOrConfig: FrontalClient | GovernanceClientConfig
): GovernanceSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new GovernanceSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      env.FRONTAL_API_URL ??
      DEFAULT_GOVERNANCE_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new GovernanceSdk(http);
}

let _governanceCache: GovernanceSdk | undefined;

export const governance = new Proxy<GovernanceSdk>({} as GovernanceSdk, {
  get(_t, prop) {
    if (!_governanceCache) {
      _governanceCache = new GovernanceSdk(getDefaultClient().httpClient);
    }
    const inst = _governanceCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
