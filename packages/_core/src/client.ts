import type { z } from "zod";
import type { ClientConfigOutput } from "./config";
import { DEFAULT_BASE_URL } from "./constants";
import { NetworkError } from "./errors";
import { HttpClient } from "./http";
import { env } from "./keys";

const unwrapClientError = (error: unknown): never => {
  if (error instanceof NetworkError) {
    if (error.cause instanceof Error) {
      throw error.cause;
    }
    throw new Error(String(error.cause));
  }
  throw error;
};

/**
 * High-level SDK client wrapping HttpClient with typed HTTP methods.
 * Automatically unwraps internal NetworkError causes and provides
 * a streamlined interface for GET, POST, PUT, PATCH, DELETE, and streaming.
 */
export class FrontalClient {
  readonly config!: ClientConfigOutput;
  readonly _http!: HttpClient;

  /**
   * @param config - Validated client configuration output from clientConfigSchema.
   */
  constructor(config: ClientConfigOutput) {
    Object.defineProperty(this, "config", {
      value: config,
      writable: false,
      enumerable: true,
    });
    const http = new HttpClient(config);
    Object.defineProperty(this, "_http", {
      value: http,
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(this, "httpClient", {
      get() {
        return http;
      },
      enumerable: true,
    });
  }

  /** Public accessor for the underlying HttpClient. */
  get httpClient(): HttpClient {
    return this._http;
  }

  /**
   * Sends a GET request and optionally validates the response against a schema.
   * @param path - API endpoint path.
   * @param schema - Optional Zod schema for response validation.
   */
  async get<T>(path: string, schema?: z.ZodType<T>): Promise<T> {
    try {
      return await this._http.get(path, undefined, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Sends a POST request with an optional JSON body and response schema.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async post<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    try {
      return await this._http.post(path, body, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Sends a PUT request with an optional JSON body and response schema.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async put<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    try {
      return await this._http.put(path, body, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Sends a PATCH request with an optional JSON body and response schema.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async patch<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    try {
      return await this._http.patch(path, body, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Sends a DELETE request with optional query parameters and response schema.
   * @param path - API endpoint path.
   * @param params - Query parameters (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async delete<T = void>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>
  ): Promise<T> {
    try {
      return await this._http.delete(path, params, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Opens a GET SSE stream and yields parsed server-sent events.
   * @param path - API endpoint path.
   * @param params - Optional query parameters.
   * @yields Objects with `type`, `data`, and optional `id` fields from SSE events.
   */
  async *stream(
    path: string,
    params?: Record<string, string>
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    try {
      yield* this._http.stream(path, params);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

  /**
   * Sends a raw PUT request with a binary/stream body and custom content type.
   * @param path - API endpoint path.
   * @param body - Binary buffer or readable stream to upload.
   * @param contentType - MIME type of the body.
   * @param headers - Additional request headers.
   * @returns The parsed JSON response (keys converted to camelCase).
   */
  async putRaw(
    path: string,
    body: Buffer | ReadableStream,
    contentType: string,
    headers: Record<string, string> = {}
  ): Promise<unknown> {
    try {
      return await this._http.putRaw(path, body, contentType, headers);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }
}

/**
 * Creates a FrontalClient using environment variables for configuration.
 * Requires `FRONTAL_API_KEY` to be set. Optionally reads `FRONTAL_API_URL`,
 * `FRONTAL_ENV`, and `FRONTAL_DEBUG` for further customization.
 *
 * @throws {Error} If `FRONTAL_API_KEY` is not set in the environment.
 */
export const getDefaultClient = (): FrontalClient => {
  if (!env.FRONTAL_API_KEY) {
    throw new Error(
      "FRONTAL_API_KEY environment variable is required. " +
        "Set it in your environment or pass apiKey explicitly to new FrontalClient()."
    );
  }

  return new FrontalClient({
    apiKey: env.FRONTAL_API_KEY,
    baseUrl: env.FRONTAL_API_URL ?? DEFAULT_BASE_URL,
    timeout: 30_000,
    maxRetries: 3,
    retryDelay: 1000,
    headers: {},
    environment: env.FRONTAL_ENV,
    debug: env.FRONTAL_DEBUG,
  });
};
