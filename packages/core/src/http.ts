import type { z } from "zod";
import { CircuitBreaker } from "./circuit-breaker";
import type { ClientConfigOutput } from "./config";
import { SDK_VERSION } from "./constants";
import { NetworkError, parseFrontalError, TimeoutError } from "./errors";
import { calculateDelay } from "./retry";
import { type StreamOptions, type StreamPart, toStreamParts } from "./stream";
import {
  createHttpSpan,
  finishSpan,
  getTelemetry,
  type TelemetryEvent,
  tagRequestId,
} from "./tracing";
import { deepCamelToSnake, deepSnakeToCamel } from "./transform";

interface ResponseTimeout {
  readonly timedOut: boolean;
  readonly deadline: Promise<never>;
  cleanup: () => void;
}

/**
 * Low-level HTTP client for the Frontal API.
 * Handles request/response transformation (snake_case ↔ camelCase),
 * retry logic, circuit breaker integration, SSE streaming, and
 * response schema validation.
 */
export class HttpClient {
  private readonly breaker?: CircuitBreaker;
  private readonly responseTimeouts = new WeakMap<Response, ResponseTimeout>();

  constructor(private readonly config: ClientConfigOutput) {
    if (config.circuitBreaker) {
      this.breaker = new CircuitBreaker({
        failureThreshold: config.circuitBreaker.failureThreshold,
        resetTimeoutMs: config.circuitBreaker.resetTimeoutMs,
      });
    }
  }

  /**
   * Sends a GET request.
   * @param path - API endpoint path.
   * @param params - Optional query parameters.
   * @param schema - Optional Zod schema for response validation.
   */
  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return this.request("GET", path, undefined, params, schema, 0, headers);
  }

  /**
   * Sends a POST request with a JSON body.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async post<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("POST", path, body ?? {}, undefined, schema);
  }

  /**
   * Sends a PUT request with a JSON body.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async put<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("PUT", path, body ?? {}, undefined, schema);
  }

  /**
   * Sends a PATCH request with a JSON body.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @param schema - Optional Zod schema for response validation.
   */
  async patch<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("PATCH", path, body ?? {}, undefined, schema);
  }

  /**
   * Sends a DELETE request.
   * @param path - API endpoint path.
   * @param params - Optional query parameters.
   * @param schema - Optional Zod schema for response validation.
   */
  async delete<T = void>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("DELETE", path, {}, params, schema);
  }

  /**
   * Sends a raw PUT request with a binary/stream body.
   * @param path - API endpoint path.
   * @param body - Binary buffer or readable stream.
   * @param contentType - MIME type of the body.
   * @param headers - Additional request headers.
   * @returns The parsed JSON response with keys converted to camelCase.
   */
  async putRaw(
    path: string,
    body: Buffer | ReadableStream,
    contentType: string,
    headers: Record<string, string> = {}
  ): Promise<unknown> {
    const url = this.buildUrl(path);
    const res = await this.fetchWithTimeout(url, {
      method: "PUT",
      headers: this.buildHeaders({ "Content-Type": contentType, ...headers }),
      // Buffer is a Uint8Array subclass; cast keeps DOM-lib consumers happy.
      body: body as unknown as RequestInit["body"],
    });
    return this.consumeResponse(res, async () => {
      if (!res.ok) await this.throwError(res);
      if (res.status === 204) return undefined;
      const json = await res.json();
      return typeof json === "object" && json !== null
        ? deepSnakeToCamel(json)
        : json;
    });
  }

  /**
   * Opens a GET SSE stream, yielding parsed server-sent events.
   * @param path - API endpoint path.
   * @param params - Optional query parameters.
   * @yields SSE event objects with `type`, `data`, and optional `id` fields.
   */
  async *stream(
    path: string,
    params?: Record<string, string>,
    options: StreamOptions = {}
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: this.buildHeaders({ Accept: "text/event-stream" }),
      },
      options.signal
    );
    if (!res.ok) await this.consumeResponse(res, () => this.throwError(res));
    yield* this.parseSSEResponse(res, options.signal);
  }

  /**
   * Like {@link stream}, but never throws: transport and HTTP failures are
   * yielded as `{ type: "error" }` parts and the stream ends with `done`.
   */
  streamParts(
    path: string,
    params?: Record<string, string>,
    options: StreamOptions = {}
  ): AsyncIterable<StreamPart> {
    return toStreamParts(this.stream(path, params, options), options);
  }

  /**
   * Sends a POST request that returns an SSE stream.
   * @param path - API endpoint path.
   * @param body - Request payload (converted to snake_case automatically).
   * @yields SSE event objects with `type`, `data`, and optional `id` fields.
   */
  async *postStream(
    path: string,
    body?: unknown,
    options: StreamOptions = {}
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    const url = this.buildUrl(path);
    const res = await this.fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: this.buildHeaders({ Accept: "text/event-stream" }),
        body: JSON.stringify(body ?? {}),
      },
      options.signal
    );
    if (!res.ok) await this.consumeResponse(res, () => this.throwError(res));
    yield* this.parseSSEResponse(res, options.signal);
  }

  /**
   * Like {@link postStream}, but never throws: failures become
   * `{ type: "error" }` parts and the stream ends with `done`.
   */
  postStreamParts(
    path: string,
    body?: unknown,
    options: StreamOptions = {}
  ): AsyncIterable<StreamPart> {
    return toStreamParts(this.postStream(path, body, options), options);
  }

  /**
   * Sends a POST request and returns the raw Response object.
   * @param path - API endpoint path.
   * @param body - Request payload.
   * @param headers - Additional request headers.
   * @returns The raw fetch Response (caller must handle parsing).
   */
  async postRaw(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = this.buildUrl(path);
    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: new Headers(this.buildHeaders(headers)),
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) await this.consumeResponse(res, () => this.throwError(res));
    this.releaseResponse(res);
    return res;
  }

  /**
   * Sends a POST request with a FormData body (multipart/form-data).
   * Automatically removes the Content-Type header so the browser sets the
   * correct multipart boundary.
   * @param path - API endpoint path.
   * @param formData - FormData payload.
   * @param headers - Additional request headers.
   * @returns The parsed JSON response with keys converted to camelCase.
   */
  async postFormData<T>(
    path: string,
    formData: FormData,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const merged = new Headers(this.buildHeaders(headers));
    merged.delete("Content-Type");

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: merged,
      body: formData,
    });
    return this.consumeResponse(res, async () => {
      if (!res.ok) await this.throwError(res);
      const json = await res.json();
      return deepSnakeToCamel(json) as T;
    });
  }

  /**
   * Sends a raw GET request and returns the Response object directly.
   * @param path - API endpoint path.
   * @param params - Optional query parameters.
   * @param headers - Additional request headers.
   * @returns The raw fetch Response (caller must handle parsing).
   */
  async getRaw(
    path: string,
    params?: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: this.buildHeaders(headers),
    });
    if (!res.ok) await this.consumeResponse(res, () => this.throwError(res));
    this.releaseResponse(res);
    return res;
  }

  private async *parseSSEResponse(
    res: Response,
    signal?: AbortSignal
  ): AsyncGenerator<{ type: string; data: unknown; id?: string }> {
    if (!res.body) {
      this.releaseResponse(res);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "message";
    let eventId: string | undefined;
    let dataLines: string[] = [];
    const timeout = this.responseTimeouts.get(res);

    const dispatchEvent = ():
      | { type: string; data: unknown; id?: string }
      | undefined => {
      if (dataLines.length === 0) {
        eventType = "message";
        eventId = undefined;
        return undefined;
      }

      const payload = dataLines.join("\n");
      let data: unknown = payload;
      try {
        const parsed = JSON.parse(payload);
        data =
          typeof parsed === "object" && parsed !== null
            ? deepSnakeToCamel(parsed)
            : parsed;
      } catch {
        // SSE data is allowed to contain plain text as well as JSON.
      }

      const event = {
        type: eventType,
        data,
        ...(eventId === undefined ? {} : { id: eventId }),
      };
      eventType = "message";
      eventId = undefined;
      dataLines = [];
      return event;
    };

    const processLine = (
      line: string
    ): { type: string; data: unknown; id?: string } | undefined => {
      if (line === "") return dispatchEvent();
      if (line.startsWith(":")) return undefined;

      const separator = line.indexOf(":");
      const field = separator === -1 ? line : line.slice(0, separator);
      let value = separator === -1 ? "" : line.slice(separator + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") {
        eventType = value || "message";
      } else if (field === "data") {
        dataLines.push(value);
      } else if (field === "id" && !value.includes("\0")) {
        eventId = value;
      }
      return undefined;
    };

    const onAbort = () => {
      void reader.cancel().catch(() => undefined);
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      while (true) {
        const read = reader.read();
        const { done, value } = timeout
          ? await Promise.race([read, timeout.deadline])
          : await read;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const event = processLine(
            rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine
          );
          if (event) yield event;
        }
      }

      buffer += decoder.decode();
      if (buffer.length > 0) {
        const event = processLine(
          buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer
        );
        if (event) yield event;
      }
      const finalEvent = dispatchEvent();
      if (finalEvent) yield finalEvent;
    } catch (error) {
      if (timeout?.timedOut) throw this.makeTimeoutError();
      throw error;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      // Release the response body if the consumer stopped early; a no-op
      // once the stream has been fully read.
      void reader.cancel().catch(() => undefined);
      this.releaseResponse(res);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>,
    attempt = 0,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const requestId = crypto.randomUUID();
    const telemetry = getTelemetry();
    const span = createHttpSpan(method, path);
    span?.setAttribute("frontal.request_id", requestId);
    if (telemetry?.recordInputs && body !== undefined) {
      span?.setAttribute("frontal.request.body", safeJson(body));
    }
    telemetry?.onRequest?.({ method, path, requestId, attempt });
    const startedAt = Date.now();
    const report = (
      status: number | undefined,
      error?: unknown,
      serverRequestId?: string
    ) => {
      const event: TelemetryEvent = {
        method,
        path,
        requestId,
        serverRequestId,
        status,
        durationMs: Date.now() - startedAt,
        error,
        attempt,
      };
      if (status !== undefined) span?.setAttribute("http.status_code", status);
      if (error) {
        span?.setStatus({ code: 2 });
        span?.end();
        telemetry?.onError?.(event);
      } else {
        finishSpan(span, status ?? 0);
        telemetry?.onResponse?.(event);
      }
    };

    const transformedBody =
      body !== undefined && body !== null ? deepCamelToSnake(body) : body;

    const reqInit: RequestInit = {
      method,
      headers: this.buildHeaders({ "X-Request-Id": requestId, ...headers }),
      ...(method !== "GET"
        ? { body: JSON.stringify(transformedBody ?? {}) }
        : { body: undefined }),
    };

    this.config.logger?.request?.(method, url, reqInit);

    const executeRequest = async (): Promise<Response> => {
      try {
        return await this.fetchWithTimeout(url, reqInit);
      } catch (error) {
        this.config.logger?.error?.(error);
        if (error instanceof TimeoutError) throw error;
        throw new NetworkError(error);
      }
    };

    let res: Response;
    try {
      res = this.breaker
        ? await this.breaker.execute(executeRequest, (response) =>
            [500, 502, 503, 504].includes(response.status)
          )
        : await executeRequest();
    } catch (error) {
      report(undefined, error);
      throw error;
    }
    const serverRequestId = res.headers.get("x-request-id") ?? undefined;

    this.config.logger?.response?.(res);

    if (!res.ok) {
      const retrySafe = method === "GET";
      const shouldRetry =
        retrySafe &&
        [429, 500, 502, 503, 504].includes(res.status) &&
        attempt < this.config.maxRetries;

      if (shouldRetry) {
        const retryAfterValue = res.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterValue
          ? Number.parseInt(retryAfterValue, 10)
          : Number.NaN;
        const delay = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : calculateDelay(
              attempt,
              "exponential",
              this.config.retryDelay,
              true
            );

        report(res.status, undefined, serverRequestId);
        this.releaseResponse(res);
        await sleep(delay);
        return this.request(
          method,
          path,
          body,
          params,
          schema,
          attempt + 1,
          headers
        );
      }

      try {
        await this.consumeResponse(res, () => this.throwError(res));
      } catch (error) {
        report(res.status, error, serverRequestId);
        throw error;
      }
    }

    try {
      const result = await this.consumeResponse(res, async () => {
        if (res.status === 204) return undefined as T;

        const contentType = (
          res.headers.get("content-type") || ""
        ).toLowerCase();
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text();

        const transformedPayload =
          typeof payload === "object" && payload !== null
            ? deepSnakeToCamel(payload)
            : payload;

        const tagId = serverRequestId ?? requestId;
        if (telemetry?.recordOutputs) {
          span?.setAttribute(
            "frontal.response.body",
            safeJson(transformedPayload)
          );
        }
        if (schema) {
          const parsed = schema.safeParse(transformedPayload);
          if (!parsed.success) {
            this.config.logger?.error?.(parsed.error);
            throw parsed.error;
          }
          return tagRequestId(parsed.data, tagId);
        }

        return tagRequestId(transformedPayload as T, tagId);
      });
      report(res.status, undefined, serverRequestId);
      return result;
    } catch (error) {
      report(res.status, error, serverRequestId);
      throw error;
    }
  }

  private parseRateLimit(res: Response) {
    const limit = res.headers.get("X-RateLimit-Limit");
    const remaining = res.headers.get("X-RateLimit-Remaining");
    const reset = res.headers.get("X-RateLimit-Reset");
    if (limit && remaining && reset) {
      return {
        limit: Number.parseInt(limit, 10),
        remaining: Number.parseInt(remaining, 10),
        reset: Number.parseInt(reset, 10),
      };
    }
    return undefined;
  }

  private async throwError(res: Response): Promise<never> {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    const retryAfter = res.headers.get("Retry-After") ?? undefined;
    const rateLimit = this.parseRateLimit(res);
    throw parseFrontalError(body, res.status, retryAfter, rateLimit);
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    let normalizedPath = path.startsWith("/") ? path : `/${path}`;

    // The base URL already includes the "/v1" version segment. If a route also
    // starts with "/v1/" the two would concatenate into ".../v1/v1/..." (a 404).
    // Strip the duplicate so packages are robust regardless of whether they
    // prefix paths with the version segment or the base URL is overridden.
    if (base.endsWith("/v1") && normalizedPath.startsWith("/v1/")) {
      if (this.config.debug) {
        console.warn(
          "[SDK] Double /v1/ prefix detected and normalized. " +
            `The base URL already includes "/v1" but the route "${normalizedPath}" ` +
            'also starts with "/v1/". Write routes without a leading "/v1".'
        );
      }
      normalizedPath = normalizedPath.slice("/v1".length);
    }

    const url = `${base}${normalizedPath}`;

    const transformedParams = params
      ? (deepCamelToSnake(params) as Record<string, unknown>)
      : params;

    if (!transformedParams || Object.keys(transformedParams).length === 0) {
      return url;
    }

    const query = Object.entries(transformedParams)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join("&");

    return query ? `${url}?${query}` : url;
  }

  private buildHeaders(
    extra: Record<string, string> = {}
  ): Record<string, string> {
    return {
      // The opaque API key (`frt_…`) is the sole public credential. The platform
      // edge validates it and exchanges it for a short-lived JWT before reaching
      // any service — the SDK never sees or sends a JWT.
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "@frontal-labs/core",
      "X-Frontal-Core": `typescript@${SDK_VERSION}`,
      "X-Frontal-Environment": this.config.environment,
      ...this.config.headers,
      ...extra,
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    signal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout>;
    let rejectDeadline: (reason?: unknown) => void = () => undefined;
    const deadline = new Promise<never>((_, reject) => {
      rejectDeadline = reject;
    });
    void deadline.catch(() => undefined);
    const forward = () => controller.abort(signal?.reason);
    const timeout: ResponseTimeout = {
      get timedOut() {
        return timedOut;
      },
      deadline,
      cleanup: () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", forward);
      },
    };
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      rejectDeadline(this.makeTimeoutError());
    }, this.config.timeout);
    if (signal?.aborted) {
      forward();
    } else {
      signal?.addEventListener("abort", forward, { once: true });
    }
    try {
      const response = await Promise.race([
        (this.config.fetch ?? fetch)(url, {
          ...init,
          signal: controller.signal,
        }),
        deadline,
      ]);
      this.responseTimeouts.set(response, timeout);
      return response;
    } catch (error) {
      timeout.cleanup();
      if (timedOut) throw this.makeTimeoutError();
      throw error;
    }
  }

  private async consumeResponse<T>(
    response: Response,
    consume: () => Promise<T>
  ): Promise<T> {
    const timeout = this.responseTimeouts.get(response);
    try {
      return timeout
        ? await Promise.race([consume(), timeout.deadline])
        : await consume();
    } catch (error) {
      if (timeout?.timedOut) throw this.makeTimeoutError();
      throw error;
    } finally {
      this.releaseResponse(response);
    }
  }

  private releaseResponse(response: Response): void {
    const timeout = this.responseTimeouts.get(response);
    timeout?.cleanup();
    this.responseTimeouts.delete(response);
  }

  private makeTimeoutError(): TimeoutError {
    return new TimeoutError(`Request timed out after ${this.config.timeout}ms`);
  }
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value).slice(0, 4096);
  } catch {
    return "[unserializable]";
  }
};
