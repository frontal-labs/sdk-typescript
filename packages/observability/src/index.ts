/**
 * @frontal-labs/observability
 *
 * Logs, metrics, traces, and alerting for Frontal.
 */

export {
  createObservabilityClient,
  type ObservabilityClientConfig,
  observability,
} from "./client";
export { DEFAULT_OBSERVABILITY_BASE_URL, VERSION } from "./constants";
export type {
  ConsoleExporterConfig,
  ExporterConfig,
  OtlpExporterConfig,
} from "./exporters";
export { createConsoleExporter, createOtlpExporter } from "./exporters";
export type { SdkFailureLogger } from "./failures";
export { logSdkFailure } from "./failures";
export * from "./schemas";
export { ObservabilitySdk } from "./sdk";
