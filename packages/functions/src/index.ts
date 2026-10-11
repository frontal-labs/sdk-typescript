/**
 * @frontal-labs/functions
 *
 * User-defined functions client for the Frontal platform.
 */

export {
  ai,
  blob,
  type Capability,
  type CapabilityBudget,
  type CapabilityBudgetInput,
  type CapabilityInput,
  data,
  kv,
  ontology,
  telemetry,
} from "./capabilities";
export {
  createFunctionsClient,
  type FunctionsClientConfig,
  functions,
} from "./client";
export { DEFAULT_FUNCTIONS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { FunctionsSdk } from "./sdk";
