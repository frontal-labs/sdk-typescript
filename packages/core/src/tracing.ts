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
