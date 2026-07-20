/**
 * @frontal-labs/observability
 *
 * Logs, metrics, traces, and alerting for Frontal.
 */

export {
  createObservabilityClient,
  observability,
  type ObservabilityClientConfig,
} from "./client";
export { DEFAULT_OBSERVABILITY_BASE_URL, VERSION } from "./constants";
export type {
  ConsoleExporterConfig,
  ExporterConfig,
  OtlpExporterConfig,
} from "./exporters";
export { createConsoleExporter, createOtlpExporter } from "./exporters";
export * from "./schemas";
export { ObservabilitySdk } from "./sdk";
