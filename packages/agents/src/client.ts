import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import {
  DEFAULT_AGENTS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AgentsSdk } from "./sdk";
import { env } from "@frontal-labs/core";

export interface AgentsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createAgentsClient(
  config: AgentsClientConfig | FrontalClient
): AgentsSdk;

export function createAgentsClient(
  clientOrConfig: FrontalClient | AgentsClientConfig
): AgentsSdk {
  if (clientOrConfig instanceof FrontalClient) {
    return new AgentsSdk(clientOrConfig.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ?? env.FRONTAL_API_URL ?? DEFAULT_AGENTS_BASE_URL,
    timeout: clientOrConfig.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: clientOrConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG ?? false,
  });
  return new AgentsSdk(http);
}

let _agentsCache: AgentsSdk | undefined;

export const agents = new Proxy<AgentsSdk>({} as AgentsSdk, {
  get(_t, prop) {
    if (!_agentsCache) {
      _agentsCache = createAgentsClient(getDefaultClient());
    }
    const inst = _agentsCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
