import { FrontalClient, HttpClient, getDefaultClient } from "@frontal/core";
import { AgentsService } from "./service";

/** Config for standalone usage without @frontal/core */
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
	clientOrConfig: FrontalClient | AgentsClientConfig,
): AgentsService {
	if (clientOrConfig instanceof FrontalClient) {
		return new AgentsService(clientOrConfig._http);
	}
	const http = new HttpClient({
		apiKey: clientOrConfig.apiKey,
		baseUrl: clientOrConfig.baseUrl ?? "https://api.frontal.dev/v1",
		timeout: clientOrConfig.timeout ?? 30000,
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

export { AgentsService, AgentBuilder } from "./service";
export type { AgentHandler, AgentContext } from "./context";
export * from "./schemas";
