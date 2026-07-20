/**
 * @frontal-labs/lineage
 *
 * Trace data lineage and impact analysis on Frontal.
 */

export {
  createLineageClient,
  lineage,
  type LineageClientConfig,
} from "./client";
export { DEFAULT_LINEAGE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { LineageSdk } from "./sdk";
