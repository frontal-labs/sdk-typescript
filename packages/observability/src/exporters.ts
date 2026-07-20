/**
 * Observability exporter configuration.
 * Configure how logs, metrics, and traces are exported to external systems.
 */

/** Configuration for an OTLP exporter. */
export interface OtlpExporterConfig {
  type: "otlp";
  /** OTLP collector endpoint URL. */
  endpoint: string;
  /** Transport protocol. */
  protocol: "http/protobuf" | "grpc";
  /** Optional HTTP headers to include in requests. */
  headers?: Record<string, string>;
}

/** Configuration for a console exporter. */
export interface ConsoleExporterConfig {
  type: "console";
  /** Whether to pretty-print output. */
  pretty?: boolean;
}

/** Union type for all supported exporter configurations. */
export type ExporterConfig = OtlpExporterConfig | ConsoleExporterConfig;

/**
 * Create an OTLP exporter configuration.
 * @param endpoint - The OTLP collector endpoint.
 * @param opts - Protocol and headers options.
 */
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

/**
 * Create a console exporter configuration.
 * @param pretty - Whether to pretty-print the output.
 */
export function createConsoleExporter(pretty = false): ConsoleExporterConfig {
  return { type: "console", pretty };
}
