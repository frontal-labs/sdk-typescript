/**
 * Lightweight tracing hooks for the Frontal Core HTTP client.
 *
 * The SDK does not bundle OpenTelemetry. To use tracing, install the
 * packages separately and pass a tracer-compatible object:
 *
 *   import { initTracing } from "@frontal-labs/core";
 *   const otel = await import("@opentelemetry/api");
 *   const sdk = await import("@opentelemetry/sdk-trace-node");
 *   const provider = new sdk.NodeTracerProvider();
 *   provider.register();
 *   const tracer = otel.trace.getTracer("my-service");
 *   initTracing(tracer);
 */

/**
 * Minimal tracer interface compatible with OpenTelemetry and custom tracers.
 */
export interface TracerLike {
  /** Starts a new span with the given name. */
  startSpan(name: string): SpanLike;
}

/**
 * Minimal span interface compatible with OpenTelemetry and custom tracers.
 */
export interface SpanLike {
  /** Sets a key-value attribute on the span. */
  setAttribute(key: string, value: string | number | boolean): void;
  /** Sets the span status (code 0 = OK, code 1 = UNSET, code 2 = ERROR). */
  setStatus(status: { code: number }): void;
  /** Ends the span. */
  end(): void;
}

let globalTracer: TracerLike | undefined;

/**
 * Returns the currently registered global tracer, if any.
 */
export function getTracer(): TracerLike | undefined {
  return globalTracer;
}

/**
 * Registers a global tracer for SDK-internal HTTP tracing.
 * Accepts any object conforming to TracerLike (e.g., an OpenTelemetry tracer).
 *
 * @example
 * ```ts
 * import { initTracing } from "@frontal-labs/core";
 * initTracing(otel.trace.getTracer("my-service"));
 * ```
 */
export function initTracing(tracer: TracerLike): void {
  globalTracer = tracer;
}

/**
 * Creates a tracing span for an HTTP request if a tracer is registered.
 * Sets `http.method` and `http.url` attributes on the span.
 *
 * @param method - HTTP method (GET, POST, etc.).
 * @param path - Request path.
 * @returns A span if a tracer is registered, otherwise undefined.
 */
export function createHttpSpan(
  method: string,
  path: string
): SpanLike | undefined {
  const tracer = globalTracer;
  if (!tracer) return undefined;

  const span = tracer.startSpan(`HTTP ${method} ${path}`);
  span.setAttribute("http.method", method);
  span.setAttribute("http.url", path);
  return span;
}

/**
 * Finishes an HTTP span, marking it as errored if the status code is >= 400.
 *
 * @param span - The span to finish (no-op if undefined).
 * @param statusCode - The HTTP response status code.
 */
export function finishSpan(
  span: SpanLike | undefined,
  statusCode: number
): void {
  if (!span) return;
  if (statusCode >= 400) {
    span.setStatus({ code: 2 }); // ERROR
  }
  span.end();
}

/** Facts about one SDK request, delivered to telemetry hooks. */
export interface TelemetryEvent {
  method: string;
  path: string;
  /** Client-generated `X-Request-Id` (also echoed by the API when present). */
  requestId: string;
  /** Server-issued request id from the response headers, if different. */
  serverRequestId?: string;
  status?: number;
  durationMs: number;
  error?: unknown;
  /** Retry attempt (0 = first try). */
  attempt: number;
}

/**
 * A telemetry provider: an OpenTelemetry-compatible tracer, request hooks,
 * or both. Everything is optional.
 */
export interface TelemetryProvider {
  tracer?: TracerLike;
  onRequest?: (
    event: Pick<TelemetryEvent, "method" | "path" | "requestId" | "attempt">
  ) => void;
  onResponse?: (event: TelemetryEvent) => void;
  onError?: (event: TelemetryEvent) => void;
  /** Record request bodies on spans as `frontal.request.body` (default false). */
  recordInputs?: boolean;
  /** Record response bodies on spans as `frontal.response.body` (default false). */
  recordOutputs?: boolean;
}

let globalProvider: TelemetryProvider | undefined;

/**
 * One-liner observability setup. Accepts an OpenTelemetry tracer directly or
 * a {@link TelemetryProvider} with hooks. Every SDK request then produces a
 * span (`HTTP <method> <path>` with `frontal.request_id`) and/or hook calls.
 *
 * @example
 * ```ts
 * import { registerTelemetry } from "@frontal-labs/core";
 * registerTelemetry({
 *   tracer: otel.trace.getTracer("my-app"),
 *   onError: (e) => console.error(e.requestId, e.error),
 * });
 * ```
 */
export function registerTelemetry(
  provider: TelemetryProvider | TracerLike
): void {
  const p: TelemetryProvider =
    "startSpan" in provider ? { tracer: provider } : provider;
  globalProvider = p;
  globalTracer = p.tracer;
}

/** Returns the registered provider (or undefined). */
export function getTelemetry(): TelemetryProvider | undefined {
  return globalProvider;
}

/** Clears any registered telemetry (tests). */
export function resetTelemetry(): void {
  globalProvider = undefined;
  globalTracer = undefined;
}

const REQUEST_ID: unique symbol = Symbol.for("frontal.requestId");

/**
 * Attaches a request id to a response object as a non-enumerable property so
 * it never leaks into `JSON.stringify` or equality checks.
 */
export function tagRequestId<T>(value: T, requestId: string): T {
  if (typeof value === "object" && value !== null) {
    try {
      Object.defineProperty(value, REQUEST_ID, {
        value: requestId,
        enumerable: false,
        configurable: true,
      });
    } catch {
      /* frozen object — ignore */
    }
  }
  return value;
}

/**
 * Reads the request id attached to any SDK response object (or error). Use
 * it to correlate with `observability.logs.query({ query: \`requestId:"…"\` })`.
 *
 * @example
 * ```ts
 * const agent = await f.agents.use("agt_1").get();
 * console.log(requestIdOf(agent)); // "req_…"
 * ```
 */
export function requestIdOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const tagged = (value as Record<symbol, unknown>)[REQUEST_ID];
  if (typeof tagged === "string") return tagged;
  const asError = value as { requestId?: unknown };
  return typeof asError.requestId === "string" ? asError.requestId : undefined;
}
