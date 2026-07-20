import { FrontalClient, getDefaultClient, HttpClient } from "frontal/core";
import {
  DEFAULT_AGENTS_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
} from "./constants";
import { AgentsSdk } from "./sdk";
import { env } from "frontal/core";

/**
 * Configuration for creating an {@link AgentsSdk} client standalone.
 *
 * @property apiKey - Frontal API key.
 * @property baseUrl - Override the default agents API base URL.
 * @property timeout - Request timeout in milliseconds (default 30_000).
 * @property maxRetries - Maximum number of retry attempts (default 3).
 */
export interface AgentsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates an {@link AgentsSdk} from either an existing {@link FrontalClient}
 * or a plain configuration object.
 *
 * @param clientOrConfig - A pre-configured FrontalClient or config options.
 * @returns A fully-initialized AgentsSdk.
 */
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

/**
 * Convenience singleton that lazily creates an {@link AgentsSdk} using the
 * default environment configuration (FRONTAL_API_KEY, FRONTAL_API_URL, etc.).
 *
 * @example
 * ```ts
 * import { agents } from "@frontal-labs/agents";
 * const list = await agents.list();
 * ```
 */
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
