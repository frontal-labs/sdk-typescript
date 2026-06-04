import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { AgentsService } from "./service";

/** Config for standalone usage of the public agents SDK */
export interface AgentsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createAgentsClient(client: FrontalClient): AgentsService;
/** Create standalone with just config */
export function createAgentsClient(config: AgentsClientConfig): AgentsService;
export function createAgentsClient(
  clientOrConfig: FrontalClient | AgentsClientConfig
): AgentsService {
  if (clientOrConfig instanceof FrontalClient) {
    return new AgentsService(clientOrConfig._http);
  }

  const baseUrl =
    clientOrConfig.baseUrl ??
    process.env.FRONTAL_AGENTS_API_URL ??
    process.env.FRONTAL_API_URL ??
    "https://api.frontal.dev/v1";

  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });

  return new AgentsService(http);
}

// Default instance that works automatically with environment variables
export const agents = new AgentsService(getDefaultClient()._http);

export type { AgentContext, AgentHandler } from "./context";
export * from "./schemas";
export { AgentBuilder, AgentsService } from "./service";
