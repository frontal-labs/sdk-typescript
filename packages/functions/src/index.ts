/**
 * @frontal/functions
 *
 * Deploy and manage serverless functions on Frontal.
 */

import { FrontalClient, getDefaultClient, HttpClient } from "@frontal/core";
import { FunctionsService } from "./client";

/** Config for standalone usage without @frontal/core */
export interface FunctionsClientConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	maxRetries?: number;
}

/** Create from a FrontalClient instance */
export function createFunctionsClient(client: FrontalClient): FunctionsService;
/** Create standalone with just config */
export function createFunctionsClient(
	config: FunctionsClientConfig,
): FunctionsService;
export function createFunctionsClient(
	clientOrConfig: FrontalClient | FunctionsClientConfig,
): FunctionsService {
	if (clientOrConfig instanceof FrontalClient) {
		return new FunctionsService(clientOrConfig._http);
	}
	const http = new HttpClient({
		apiKey: clientOrConfig.apiKey,
		baseUrl:
			clientOrConfig.baseUrl ??
			process.env.FRONTAL_FUNCTIONS_API_URL ??
			process.env.FRONTAL_API_URL ??
			"https://api.frontal.dev/v1",
		timeout: clientOrConfig.timeout ?? 30000,
		maxRetries: clientOrConfig.maxRetries ?? 3,
		retryDelay: 1000,
		headers: {},
		environment: "production",
		debug: false,
	});
	return new FunctionsService(http);
}

// Default instance
export const functions = createFunctionsClient(getDefaultClient());

// New Pattern B exports
export { FunctionsService } from "./client";

// Deprecated Pattern A compat
export { Functions } from "./compat";

export { DEFAULT_FUNCTIONS_BASE_URL, VERSION } from "./constants";
export type {
	APIResponse,
	ErrorResponse,
	FunctionConfig,
	FunctionEntry,
	FunctionsConfig,
	InvocationStats,
	InvokeOptions,
} from "./types";
