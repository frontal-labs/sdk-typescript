import type { HttpClient } from "@frontal/core";
import {
	type FunctionConfig,
	type FunctionEntry,
	functionConfigSchema,
	functionSchema,
	type InvocationStats,
	type InvokeOptions,
	invocationStatsSchema,
	invokeOptionsSchema,
} from "./types";

/**
 * Service for interacting with Frontal Functions.
 * Takes an HttpClient and returns data directly, throwing typed errors.
 *
 * @example
 * ```typescript
 * import { createFunctionsClient } from '@frontal/functions'
 * import { FrontalClient } from '@frontal/core'
 *
 * const client = new FrontalClient({ apiKey: 'frt_...' })
 * const functions = createFunctionsClient(client)
 * const fn = await functions.deploy({ name: 'my-fn', ... })
 * ```
 */
export class FunctionsService {
	constructor(private readonly http: HttpClient) {}

	/**
	 * Deploys a new function.
	 * @param config - The function configuration.
	 * @returns The deployed function entry.
	 * @throws ValidationError on invalid config, FrontalError on API errors.
	 */
	async deploy(config: FunctionConfig): Promise<FunctionEntry> {
		const validated = functionConfigSchema.parse(config);
		return this.http.post<FunctionEntry>(
			"/functions/deploy",
			validated,
			functionSchema,
		);
	}

	/**
	 * Lists all functions.
	 */
	async list(): Promise<FunctionEntry[]> {
		return this.http.get<FunctionEntry[]>("/functions/list");
	}

	/**
	 * Gets details of a specific function.
	 * @param id - The function ID.
	 */
	async get(id: string): Promise<FunctionEntry> {
		return this.http.get<FunctionEntry>(
			`/functions/get/${id}`,
			undefined,
			functionSchema,
		);
	}

	/**
	 * Deletes a function.
	 * @param id - The function ID.
	 */
	async delete(id: string): Promise<void> {
		return this.http.delete(`/functions/delete/${id}`);
	}

	/**
	 * Invokes a function synchronously.
	 * @param id - The function ID.
	 * @param options - Invocation options.
	 */
	async invoke(id: string, options: InvokeOptions = {}): Promise<unknown> {
		const validated = invokeOptionsSchema.parse(options);
		return this.http.post(`/functions/invoke/${id}`, validated);
	}

	/**
	 * Invokes a function with streaming response.
	 * @param id - The function ID.
	 * @param options - Invocation options.
	 * @returns AsyncIterable yielding SSE events.
	 */
	async *invokeStream(
		id: string,
		options: InvokeOptions = {},
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		const validated = invokeOptionsSchema.parse(options);
		yield* this.http.postStream(`/functions/invoke/${id}`, {
			...validated,
			stream: true,
		});
	}

	/**
	 * Retrieves invocation statistics for a function.
	 * @param id - The function ID.
	 */
	async stats(id: string): Promise<InvocationStats> {
		return this.http.get<InvocationStats>(
			`/functions/stats/${id}`,
			undefined,
			invocationStatsSchema,
		);
	}

	/**
	 * Updates only the trigger configuration for a function.
	 * @param id - The function ID.
	 * @param trigger - The new trigger configuration.
	 */
	async updateTriggers(
		id: string,
		trigger: FunctionConfig["trigger"],
	): Promise<FunctionEntry> {
		return this.http.put<FunctionEntry>(
			`/functions/triggers/${id}`,
			trigger,
			functionSchema,
		);
	}
}
