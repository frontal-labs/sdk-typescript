/**
 * @frontal-labs/pipelines
 *
 * Build and run data pipelines on Frontal.
 */

export {
  createPipelinesClient,
  pipelines,
  type PipelinesClientConfig,
} from "./client";
export { DEFAULT_PIPELINES_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { PipelinesSdk } from "./sdk";
