/**
 * @frontal-labs/ontology
 *
 * Define and manage Frontal ontology schemas and objects.
 */

export {
  createOntologyClient,
  ontology,
  type OntologyClientConfig,
} from "./client";
export { DEFAULT_ONTOLOGY_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { OntologySdk } from "./sdk";
