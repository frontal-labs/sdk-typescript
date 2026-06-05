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

export interface TracerLike {
  startSpan(name: string): SpanLike;
}

export interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: number }): void;
  end(): void;
}

let globalTracer: TracerLike | undefined;

export function getTracer(): TracerLike | undefined {
  return globalTracer;
}

export function initTracing(tracer: TracerLike): void {
  globalTracer = tracer;
}

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
