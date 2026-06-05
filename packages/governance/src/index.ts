import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_GOVERNANCE_BASE_URL, VERSION } from "./constants";
import { GovernanceService } from "./service";

export interface GovernanceClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createGovernanceClient(
  client: FrontalClient
): GovernanceService;
export function createGovernanceClient(
  config: GovernanceClientConfig
): GovernanceService;
export function createGovernanceClient(
  clientOrConfig: FrontalClient | GovernanceClientConfig
): GovernanceService {
  if (clientOrConfig instanceof FrontalClient) {
    return new GovernanceService(clientOrConfig._http);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_GOVERNANCE_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_GOVERNANCE_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new GovernanceService(http);
}

export const governance = new GovernanceService(getDefaultClient()._http);

export { DEFAULT_GOVERNANCE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { GovernanceService } from "./service";
