/**
 * @frontal-labs/ontology
 *
 * Define and manage Frontal ontology schemas and objects.
 */

export {
  createOntologyClient,
  type OntologyClientConfig,
  ontology,
} from "./client";
export { DEFAULT_ONTOLOGY_BASE_URL, VERSION } from "./constants";
export {
  type EntityCreate,
  type EntityHandle,
  type EntityRead,
  type EntityRelations,
  type EntityUpdate,
  type EntityWithRelations,
  type OntologyClient,
  type OntologyRuntime,
  type UntypedOntology,
  withEntityHandles,
} from "./entities";
export * from "./schemas";
export { OntologySdk } from "./sdk";
