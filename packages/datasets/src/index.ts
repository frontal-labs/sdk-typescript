/**
 * @frontal-labs/datasets
 *
 * Manage datasets, schemas, and catalog on Frontal.
 */

export {
  createDatasetsClient,
  datasets,
  type DatasetsClientConfig,
} from "./client";
export { DEFAULT_DATASETS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { DatasetsSdk } from "./sdk";
