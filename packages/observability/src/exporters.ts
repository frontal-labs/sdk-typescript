/**
 * Observability exporter configuration.
 * Configure how logs, metrics, and traces are exported to external systems.
 */

export interface OtlpExporterConfig {
  type: "otlp";
  endpoint: string;
  protocol: "http/protobuf" | "grpc";
  headers?: Record<string, string>;
}

export interface ConsoleExporterConfig {
  type: "console";
  pretty?: boolean;
}

export type ExporterConfig = OtlpExporterConfig | ConsoleExporterConfig;

export function createOtlpExporter(
  endpoint: string,
  opts: {
    protocol?: "http/protobuf" | "grpc";
    headers?: Record<string, string>;
  } = {}
): OtlpExporterConfig {
  return {
    type: "otlp",
    endpoint,
    protocol: opts.protocol ?? "http/protobuf",
    headers: opts.headers,
  };
}

export function createConsoleExporter(
  pretty: boolean = false
): ConsoleExporterConfig {
  return { type: "console", pretty };
}
