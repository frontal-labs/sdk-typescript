/**
 * @frontal-labs/lineage
 *
 * Trace data lineage and impact analysis on Frontal.
 */

export {
  createLineageClient,
  type LineageClientConfig,
  lineage,
} from "./client";
export { DEFAULT_LINEAGE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { LineageSdk } from "./sdk";
