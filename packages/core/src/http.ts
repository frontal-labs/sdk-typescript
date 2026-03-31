import type { z } from "zod";
import type { ClientConfigOutput } from "./config";
import { NetworkError, parseFrontalError } from "./errors";
import { calculateDelay } from "./retry";

/**
 * HTTP client for making requests to the Frontal API.
 * Handles authentication, retries, timeouts, and response parsing.
 *
 * @example
 * ```typescript
 * const client = new HttpClient(config)
 * const users = await client.get('/users')
 * const user = await client.post('/users', { name: 'John' })
 * ```
 */
export class HttpClient {
	/**
	 * Creates a new HttpClient instance.
	 * @param config - Client configuration
	 */
	constructor(private readonly config: ClientConfigOutput) {}

	/**
	 * Makes a GET request to the specified endpoint.
	 * @param path - API endpoint path
	 * @param params - Optional query parameters
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 *
	 * @example
	 * ```typescript
	 * const users = await client.get('/users')
	 * const user = await client.get('/users/123')
	 * const filtered = await client.get('/users', { page: 1, limit: 10 })
	 * ```
	 */
	async get<T>(
		path: string,
		params?: Record<string, unknown>,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this.request("GET", path, undefined, params, schema);
	}

	/**
	 * Makes a POST request to the specified endpoint.
	 * @param path - API endpoint path
	 * @param body - Optional request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 *
	 * @example
	 * ```typescript
	 * const user = await client.post('/users', { name: 'John', email: 'john@example.com' })
	 * ```
	 */
	async post<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this.request("POST", path, body, undefined, schema);
	}

	/**
	 * Makes a PUT request to the specified endpoint.
	 * @param path - API endpoint path
	 * @param body - Optional request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 *
	 * @example
	 * ```typescript
	 * const updated = await client.put('/users/123', { name: 'John Updated' })
	 * ```
	 */
	async put<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this.request("PUT", path, body, undefined, schema);
	}

	/**
	 * Makes a PATCH request to the specified endpoint.
	 * @param path - API endpoint path
	 * @param body - Optional request body data
	 * @param schema - Optional Zod schema for response validation
	 * @returns Promise resolving to the response data
	 *
	 * @example
	 * ```typescript
	 * const updated = await client.patch('/users/123', { name: 'John Updated' })
	 * ```
	 */
	async patch<T>(
		path: string,
		body?: unknown,
		schema?: z.ZodType<T>,
	): Promise<T> {
		return this.request("PATCH", path, body, undefined, schema);
	}

	/**
	 * Makes a DELETE request to the specified endpoint.
	 * @param path - API endpoint path
	 * @param params - Optional query parameters
	 * @returns Promise resolving to void or response data
	 *
	 * @example
	 * ```typescript
	 * await client.delete('/users/123')
	 * await client.delete('/users', { soft: true })
	 * ```
	 */
	async delete<T = void>(
		path: string,
		params?: Record<string, unknown>,
	): Promise<T> {
		return this.request("DELETE", path, undefined, params);
	}

	/**
	 * Makes a PUT request with raw binary data.
	 * Useful for file uploads or streaming data.
	 * @param path - API endpoint path
	 * @param body - Raw data (Buffer or ReadableStream)
	 * @param contentType - Content-Type header value
	 * @param headers - Additional headers to include
	 * @returns Promise resolving to the response data
	 *
	 * @example
	 * ```typescript
	 * const fileData = fs.readFileSync('file.txt')
	 * const result = await client.putRaw('/files/upload', fileData, 'text/plain')
	 * ```
	 */
	async putRaw(
		path: string,
		body: Buffer | ReadableStream,
		contentType: string,
		headers: Record<string, string> = {},
	): Promise<unknown> {
		const url = this.buildUrl(path);
		const res = await this.fetchWithTimeout(url, {
			method: "PUT",
			headers: this.buildHeaders({ "Content-Type": contentType, ...headers }),
			body: body as ReadableStream | Buffer | string,
		});
		if (!res.ok) await this.throwError(res);
		return res.status === 204 ? undefined : res.json();
	}

	/**
	 * Creates an async iterator for Server-Sent Events (SSE) streaming.
	 * @param path - API endpoint path
	 * @param params - Optional query parameters
	 * @returns AsyncIterable yielding SSE events
	 *
	 * @example
	 * ```typescript
	 * for await (const event of client.stream('/events')) {
	 *   console.log('Event:', event.type, event.data)
	 * }
	 * ```
	 */
	async *stream(
		path: string,
		params?: Record<string, string>,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		const url = this.buildUrl(path, params);
		const res = await (this.config.fetch ?? fetch)(url, {
			headers: this.buildHeaders({ Accept: "text/event-stream" }),
		});
		if (!res.ok) await this.throwError(res);
		yield* this.parseSSEResponse(res);
	}

	/**
	 * Creates an async iterator for POST-based Server-Sent Events (SSE) streaming.
	 * @param path - API endpoint path
	 * @param body - Optional request body data (sent as JSON)
	 * @returns AsyncIterable yielding SSE events
	 */
	async *postStream(
		path: string,
		body?: unknown,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		const url = this.buildUrl(path);
		const res = await this.fetchWithTimeout(url, {
			method: "POST",
			headers: this.buildHeaders({ Accept: "text/event-stream" }),
			...(body !== undefined && { body: JSON.stringify(body) }),
		});
		if (!res.ok) await this.throwError(res);
		yield* this.parseSSEResponse(res);
	}

	/**
	 * Makes a POST request and returns the raw Response object.
	 * Useful when the caller needs to consume the response as ArrayBuffer, Blob, etc.
	 * @param path - API endpoint path
	 * @param body - Optional request body data (sent as JSON)
	 * @param headers - Additional headers to include
	 * @returns Promise resolving to the raw Response
	 */
	async postRaw(
		path: string,
		body?: unknown,
		headers: Record<string, string> = {},
	): Promise<Response> {
		const url = this.buildUrl(path);
		const res = await this.fetchWithTimeout(url, {
			method: "POST",
			headers: this.buildHeaders(headers),
			...(body !== undefined && { body: JSON.stringify(body) }),
		});
		if (!res.ok) await this.throwError(res);
		return res;
	}

	/**
	 * Makes a POST request with FormData body.
	 * Omits Content-Type header so the runtime sets the multipart boundary automatically.
	 * @param path - API endpoint path
	 * @param formData - FormData to send
	 * @param headers - Additional headers to include
	 * @returns Promise resolving to the parsed JSON response
	 */
	async postFormData<T>(
		path: string,
		formData: FormData,
		headers: Record<string, string> = {},
	): Promise<T> {
		const url = this.buildUrl(path);
		const h = this.buildHeaders(headers);
		h.delete("Content-Type"); // let runtime set multipart boundary
		const res = await this.fetchWithTimeout(url, {
			method: "POST",
			headers: h,
			body: formData,
		});
		if (!res.ok) await this.throwError(res);
		return res.json();
	}

	/**
	 * Makes a GET request and returns the raw Response object.
	 * Useful for downloading files as Blob or ReadableStream.
	 * @param path - API endpoint path
	 * @param params - Optional query parameters
	 * @param headers - Additional headers to include
	 * @returns Promise resolving to the raw Response
	 */
	async getRaw(
		path: string,
		params?: Record<string, unknown>,
		headers: Record<string, string> = {},
	): Promise<Response> {
		const url = this.buildUrl(path, params);
		const res = await this.fetchWithTimeout(url, {
			method: "GET",
			headers: this.buildHeaders(headers),
		});
		if (!res.ok) await this.throwError(res);
		return res;
	}

	private async *parseSSEResponse(
		res: Response,
	): AsyncGenerator<{ type: string; data: unknown; id?: string }> {
		if (!res.body) return;

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			let event: { type: string; data: unknown; id?: string } = {
				type: "message",
				data: null,
			};
			for (const line of lines) {
				if (line.startsWith("id:")) event.id = line.slice(3).trim();
				else if (line.startsWith("event:")) event.type = line.slice(6).trim();
				else if (line.startsWith("data:")) {
					try {
						event.data = JSON.parse(line.slice(5).trim());
					} catch {
						event.data = line.slice(5).trim();
					}
				} else if (line === "") {
					yield event;
					event = { type: "message", data: null };
				}
			}
		}
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
		params?: Record<string, unknown>,
		schema?: z.ZodType<T>,
		attempt = 0,
	): Promise<T> {
		const url = this.buildUrl(path, params);
		const requestId = crypto.randomUUID();

		const reqInit: RequestInit = {
			method,
			headers: this.buildHeaders({ "X-Request-Id": requestId }),
			...(body !== undefined && { body: JSON.stringify(body) }),
		};

		this.config.logger?.request?.();

		let res: Response;
		try {
			res = await this.fetchWithTimeout(url, reqInit);
		} catch (err) {
			if (attempt < this.config.maxRetries) {
				await sleep(
					calculateDelay(attempt, {
						maxRetries: this.config.maxRetries,
						retryDelay: this.config.retryDelay,
						backoff: "exponential",
						retryOn: [],
					}),
				);
				return this.request(method, path, body, params, schema, attempt + 1);
			}
			throw new NetworkError(err);
		}

		this.config.logger?.response?.();

		if (!res.ok) {
			const shouldRetry =
				[429, 500, 502, 503, 504].includes(res.status) &&
				attempt < this.config.maxRetries;
			if (shouldRetry) {
				const retryAfter = res.headers.get("Retry-After");
				const delay = retryAfter
					? parseInt(retryAfter, 10) * 1000
					: calculateDelay(attempt, {
							maxRetries: this.config.maxRetries,
							retryDelay: this.config.retryDelay,
							backoff: "exponential",
							retryOn: [],
						});
				await sleep(delay);
				return this.request(method, path, body, params, schema, attempt + 1);
			}
			await this.throwError(res);
		}

		if (res.status === 204) return undefined as T;

		const json = await res.json();

		if (schema) {
			const parsed = schema.safeParse(json);
			if (!parsed.success) {
				if (this.config.debug)
					console.warn(
						"[frontal] Response schema mismatch:",
						parsed.error.issues,
					);
				return json as T;
			}
			return parsed.data;
		}

		return json as T;
	}

	private async throwError(res: Response): Promise<never> {
		let body: unknown;
		try {
			body = await res.json();
		} catch {
			body = {};
		}
		const retryAfter = res.headers.get("Retry-After") ?? undefined;
		throw parseFrontalError(body, res.status, retryAfter);
	}

	private buildUrl(path: string, params?: Record<string, unknown>): string {
		const base = this.config.baseUrl.replace(/\/$/, "");
		const url = new URL(`${base}${path}`);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
			}
		}
		return url.toString();
	}

	private buildHeaders(extra: Record<string, string> = {}): Headers {
		return new Headers({
			Authorization: `Bearer ${this.config.apiKey}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-Frontal-Core": "typescript@1.0.0",
			"X-Frontal-Environment": this.config.environment,
			...this.config.headers,
			...extra,
		});
	}

	private async fetchWithTimeout(
		url: string,
		init: RequestInit,
	): Promise<Response> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.config.timeout);
		try {
			return await (this.config.fetch ?? fetch)(url, {
				...init,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timer);
		}
	}
}

const sleep = async (ms: number): Promise<void> => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
};
