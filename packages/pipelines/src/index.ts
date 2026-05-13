import { FrontalClient, getDefaultClient, HttpClient } from "@frontal/core";
import { PipelinesService } from "./service";

/** Config for standalone usage without @frontal/core */
export interface PipelinesClientConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createPipelinesClient(client: FrontalClient): PipelinesService;
/** Create standalone with just config */
export function createPipelinesClient(
	config: PipelinesClientConfig,
): PipelinesService;
export function createPipelinesClient(
	clientOrConfig: FrontalClient | PipelinesClientConfig,
): PipelinesService {
	if (clientOrConfig instanceof FrontalClient) {
		return new PipelinesService(clientOrConfig._http);
	}
	const http = new HttpClient({
		apiKey: clientOrConfig.apiKey,
		baseUrl:
			clientOrConfig.baseUrl ??
			process.env.FRONTAL_PIPELINES_API_URL ??
			process.env.FRONTAL_API_URL ??
			"https://api.frontal.dev/v1",
		timeout: clientOrConfig.timeout ?? 30000,
		maxRetries: clientOrConfig.maxRetries ?? 3,
		retryDelay: 1000,
		headers: {},
		environment: "production",
		debug: false,
	});
	return new PipelinesService(http);
}

// Default instance that works automatically with environment variables
export const pipelines = new PipelinesService(getDefaultClient()._http);

export * from "./schemas";
export { PipelinesService } from "./service";
