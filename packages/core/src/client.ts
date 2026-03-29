import type { ClientConfigOutput } from "./config";
import type { z } from "zod";
import { HttpClient } from "./http";
import { keys } from "./keys";

/**
 * Main Frontal Core client.
 * Provides access to all Frontal services and utilities.
 *
 * @example
 * ```typescript
 * import { FrontalClient } from '@frontal/core'
 *
 * const client = new FrontalClient({
 *   apiKey: 'frt_1234567890abcdef',
 *   environment: 'development'
 * })
 * ```
 */
export class FrontalClient {
	/**
	 * Client configuration (read-only).
	 */
	readonly config: ClientConfigOutput;

	/**
	 * HTTP client for making API requests.
	 */
	readonly _http: HttpClient;

	/**
	 * Creates a new FrontalClient instance.
	 * @param config - Client configuration
	 */
	constructor(config: ClientConfigOutput) {
		this.config = config;
		this._http = new HttpClient(config);
	}

	/**
	 * Makes a GET request to the API.
	 * @param path - API endpoint path
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 */
	async get<T>(path: string, schema?: z.ZodType<T>): Promise<T> {
		return this._http.get(path, undefined, schema);
	}

	/**
	 * Makes a POST request to the API.
	 * @param path - API endpoint path
	 * @param body - Request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 */
	async post<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this._http.post(path, body, schema);
	}

	/**
	 * Makes a PUT request to the API.
	 * @param path - API endpoint path
	 * @param body - Request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 */
	async put<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this._http.put(path, body, schema);
	}

	/**
	 * Makes a PATCH request to the API.
	 * @param path - API endpoint path
	 * @param body - Request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 */
	async patch<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this._http.patch(path, body, schema);
	}

	/**
	 * Makes a DELETE request to the API.
	 * @param path - API endpoint path
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 */
	async delete<T = void>(path: string, schema?: z.ZodType<T>): Promise<T> {
		return this._http.delete(path, undefined);
	}

	/**
	 * Creates an async iterator for Server-Sent Events (SSE) streaming.
	 * @param path - API endpoint path
	 * @param params - Optional query parameters
	 * @returns AsyncIterable yielding SSE events
	 */
	async *stream(
		path: string,
		params?: Record<string, string>,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		yield* this._http.stream(path, params);
	}

	/**
	 * Makes a PUT request with raw binary data.
	 * @param path - API endpoint path
	 * @param body - Raw data (Buffer or ReadableStream)
	 * @param contentType - Content-Type header value
	 * @param headers - Additional headers to include
	 * @returns Promise resolving to the response data
	 */
	async putRaw(
		path: string,
		body: Buffer | ReadableStream,
		contentType: string,
		headers: Record<string, string> = {},
	): Promise<unknown> {
		return this._http.putRaw(path, body, contentType, headers);
	}
}

/**
 * Creates a default FrontalClient instance using environment variables.
 * @returns A configured FrontalClient instance
 */
export const getDefaultClient = (): FrontalClient => {
	const env = keys();
	return new FrontalClient({
		apiKey: env.FRONTAL_API_KEY || "placeholder-key",
		baseUrl: env.FRONTAL_API_URL || "https://api.frontal.dev/v1",
		timeout: 30000,
		maxRetries: 3,
		retryDelay: 1000,
		headers: {},
		environment: env.NODE_ENV || "development",
		debug: env.NODE_ENV === "development",
	});
};
