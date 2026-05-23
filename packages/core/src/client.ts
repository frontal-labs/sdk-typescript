import type { z } from "zod";
import type { ClientConfigOutput } from "./config";
import { NetworkError } from "./errors";
import { HttpClient } from "./http";
import { keys } from "./keys";

const unwrapClientError = (error: unknown): never => {
  if (error instanceof NetworkError) {
    if (error.cause instanceof Error) {
      throw error.cause;
    }
    throw new Error(String(error.cause));
  }
  throw error;
};

export class FrontalClient {
  readonly config!: ClientConfigOutput;
  readonly _http!: HttpClient;

  constructor(config: ClientConfigOutput) {
    Object.defineProperty(this, "config", {
      value: config,
      writable: false,
      enumerable: true,
    });
    Object.defineProperty(this, "_http", {
      value: new HttpClient(config),
      writable: false,
      enumerable: true,
    });
  }

  async get<T>(path: string, schema?: z.ZodType<T>): Promise<T> {
    try {
      return await this._http.get(path, undefined, schema);
    } catch (error) {
      throw unwrapClientError(error);
    }
  }

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

export const getDefaultClient = (): FrontalClient => {
  const env = keys.client.safeParse(process.env);
  const parsed = env.success
    ? env.data
    : { FRONTAL_API_KEY: "placeholder-key" };

  return new FrontalClient({
    apiKey: parsed.FRONTAL_API_KEY,
    baseUrl: process.env.FRONTAL_API_URL || "https://api.frontal.dev/v1",
    timeout: 30_000,
    maxRetries: 3,
    retryDelay: 1000,
    headers: {},
    environment: parsed.FRONTAL_ENVIRONMENT ?? "development",
    debug: parsed.FRONTAL_DEBUG ?? false,
  });
};
