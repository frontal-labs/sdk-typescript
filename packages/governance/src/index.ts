import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_GOVERNANCE_BASE_URL } from "./constants";
import { GovernanceService } from "./service";

export interface GovernanceClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
export function createGovernanceClient(
  config: GovernanceClientConfig | FrontalClient
): GovernanceService;
export function createGovernanceClient(
  clientOrConfig: FrontalClient | GovernanceClientConfig
): GovernanceService {
  if (clientOrConfig instanceof FrontalClient) {
    return new GovernanceService(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_GOVERNANCE_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_GOVERNANCE_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new GovernanceService(http);
}

let _governanceCache: GovernanceService | undefined;
export const governance = new Proxy<GovernanceService>(
  {} as GovernanceService,
  {
    get(_t, prop) {
      if (!_governanceCache) {
        _governanceCache = new GovernanceService(getDefaultClient().httpClient);
      }
      const inst = _governanceCache;
      const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(inst)
        : val;
    },
  }
);

export { DEFAULT_GOVERNANCE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { GovernanceService } from "./service";
