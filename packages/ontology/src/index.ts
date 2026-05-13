import { FrontalClient, getDefaultClient, HttpClient } from "@frontal/core";
import { OntologyService } from "./service";

/** Config for standalone usage without @frontal/core */
export interface OntologyClientConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createOntologyClient(client: FrontalClient): OntologyService;
/** Create standalone with just config */
export function createOntologyClient(
	config: OntologyClientConfig,
): OntologyService;
export function createOntologyClient(
	clientOrConfig: FrontalClient | OntologyClientConfig,
): OntologyService {
	if (clientOrConfig instanceof FrontalClient) {
		return new OntologyService(clientOrConfig._http);
	}
	const http = new HttpClient({
		apiKey: clientOrConfig.apiKey,
		baseUrl:
			clientOrConfig.baseUrl ??
			process.env.FRONTAL_ONTOLOGY_API_URL ??
			process.env.FRONTAL_API_URL ??
			"https://api.frontal.dev/v1",
		timeout: clientOrConfig.timeout ?? 30000,
		maxRetries: clientOrConfig.maxRetries ?? 3,
		retryDelay: 1000,
		headers: {},
		environment: "production",
		debug: false,
	});
	return new OntologyService(http);
}

// Default instance that works automatically with environment variables
export const ontology = new OntologyService(getDefaultClient()._http);

export * from "./schemas";
export { OntologyService } from "./service";
