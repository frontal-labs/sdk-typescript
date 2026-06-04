import type { z } from "zod";
import type { ClientConfigOutput } from "./config";
import { NetworkError, parseFrontalError } from "./errors";
import { calculateDelay } from "./retry";

export class HttpClient {
  constructor(private readonly config: ClientConfigOutput) {}

  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("GET", path, undefined, params, schema);
  }

  async post<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("POST", path, body ?? {}, undefined, schema);
  }

  async put<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("PUT", path, body ?? {}, undefined, schema);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("PATCH", path, body ?? {}, undefined, schema);
  }

  async delete<T = void>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request("DELETE", path, {}, params, schema);
  }

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
      body: body as ReadableStream | Buffer | string,
    });
    if (!res.ok) await this.throwError(res);
    return res.status === 204 ? undefined : await res.json();
  }

  async *stream(
    path: string,
    params?: Record<string, string>
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    const url = this.buildUrl(path, params);
    const res = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: this.buildHeaders({ Accept: "text/event-stream" }),
    });
    if (!res.ok) await this.throwError(res);
    yield* this.parseSSEResponse(res);
  }

  async *postStream(
    path: string,
    body?: unknown
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    const url = this.buildUrl(path);
    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.buildHeaders({ Accept: "text/event-stream" }),
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) await this.throwError(res);
    yield* this.parseSSEResponse(res);
  }

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
    if (!res.ok) await this.throwError(res);
    return res;
  }

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
    if (!res.ok) await this.throwError(res);
    return (await res.json()) as T;
  }

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
    if (!res.ok) await this.throwError(res);
    return res;
  }

  private async *parseSSEResponse(
    res: Response
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

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line.startsWith("id:")) {
          event.id = line.slice(3).trim();
        } else if (line.startsWith("event:")) {
          event.type = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          try {
            event.data = JSON.parse(payload);
          } catch {
            event.data = payload;
          }
        } else if (line === "") {
          if (event.data !== null) yield event;
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
    attempt = 0
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const requestId = crypto.randomUUID();

    const reqInit: RequestInit = {
      method,
      headers: this.buildHeaders({ "X-Request-Id": requestId }),
      ...(method !== "GET"
        ? { body: JSON.stringify(body ?? {}) }
        : { body: undefined }),
    };

    this.config.logger?.request?.(method, url, reqInit);

    let res: Response;
    try {
      res = await this.fetchWithTimeout(url, reqInit);
    } catch (error) {
      this.config.logger?.error?.(error);
      throw new NetworkError(error);
    }

    this.config.logger?.response?.(res);

    if (!res.ok) {
      const shouldRetry =
        [429, 500, 502, 503, 504].includes(res.status) &&
        attempt < this.config.maxRetries;

      if (shouldRetry) {
        const retryAfterValue = res.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterValue
          ? Number.parseInt(retryAfterValue, 10)
          : NaN;
        const delay = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : calculateDelay(
              attempt,
              "exponential",
              this.config.retryDelay,
              true
            );

        await sleep(delay);
        return this.request(method, path, body, params, schema, attempt + 1);
      }

      await this.throwError(res);
    }

    if (res.status === 204) return undefined as T;

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const payload = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (schema) {
      try {
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          this.config.logger?.error?.(parsed.error);
          throw parsed.error;
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof Error && error.message.includes("_zod")) {
          return payload as T;
        }
        throw error;
      }
    }

    return payload as T;
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
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${normalizedPath}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const query = Object.entries(params)
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
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "@frontal-labs/core",
      "X-Frontal-Core": "typescript@1.0.0",
      "X-Frontal-Environment": this.config.environment,
      ...this.config.headers,
      ...extra,
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
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

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
