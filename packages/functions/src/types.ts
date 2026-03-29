import { z } from "zod";

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
	message: string;
	statusCode: number;
	name: string;
}

/**
 * Standard API response structure.
 */
export interface APIResponse<T> {
	data: T | null;
	error: ErrorResponse | null;
	headers: Record<string, string> | null;
}

/**
 * Zod schema for function configuration.
 */
export const functionConfigSchema = z.object({
	name: z.string().min(1),
	runtime: z.enum(["nodejs18", "nodejs20", "python3.9", "go1.x"]),
	handler: z.string().min(1),
	memory: z.number().int().min(128).max(3008), // MB
	timeout: z.number().int().min(1).max(900), // seconds
	env: z.record(z.string(), z.string()).optional(),
	trigger: z
		.object({
			type: z.enum(["http", "cron", "queue"]),
			schedule: z.string().optional(), // For cron
			queueName: z.string().optional(), // For queue
		})
		.optional(),
});

/**
 * Function configuration.
 */
export type FunctionConfig = z.infer<typeof functionConfigSchema>;

/**
 * Zod schema for a deployed function.
 */
export const functionSchema = functionConfigSchema.extend({
	id: z.string(),
	url: z.string().url().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

/**
 * A deployed function.
 */
export type FunctionEntry = z.infer<typeof functionSchema>;

/**
 * Zod schema for function invocation options.
 */
export const invokeOptionsSchema = z.object({
	payload: z.unknown().optional(),
	headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Invocation options.
 */
export type InvokeOptions = z.infer<typeof invokeOptionsSchema>;

/**
 * Invocation statistics.
 */
export const invocationStatsSchema = z.object({
	functionId: z.string(),
	totalInvocations: z.number().int(),
	errors: z.number().int(),
	averageDuration: z.number(),
	lastInvoked: z.string().datetime().optional(),
});

/**
 * Invocation statistics.
 */
export type InvocationStats = z.infer<typeof invocationStatsSchema>;

/**
 * Configuration for the Functions client.
 */
export const functionsConfigSchema = z.object({
	apiKey: z.string().optional(),
	baseUrl: z.string().url().optional(),
	environment: z.string().optional(),
	timeout: z.number().optional(),
	maxRetries: z.number().optional(),
	retryDelay: z.number().optional(),
	headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Functions configuration.
 */
export type FunctionsConfig = z.infer<typeof functionsConfigSchema>;

/**
 * Interface for the Functions client.
 */
export interface IFunctionsClient {
	/**
	 * Deploys a new function.
	 */
	deploy(config: FunctionConfig): Promise<APIResponse<FunctionEntry>>;
	/**
	 * Lists all functions.
	 */
	list(): Promise<APIResponse<FunctionEntry[]>>;
	/**
	 * Gets details of a specific function.
	 */
	get(id: string): Promise<APIResponse<FunctionEntry>>;
	/**
	 * Deletes a function.
	 */
	delete(id: string): Promise<APIResponse<void>>;
	/**
	 * Invokes a function synchronously.
	 */
	invoke(id: string, options?: InvokeOptions): Promise<APIResponse<unknown>>;
	/**
	 * Retrieves invocation statistics for a function.
	 */
	stats(id: string): Promise<APIResponse<InvocationStats>>;
	/**
	 * Updates only the trigger configuration for a function.
	 */
	updateTriggers(
		id: string,
		trigger: FunctionConfig["trigger"],
	): Promise<APIResponse<FunctionEntry>>;
}
