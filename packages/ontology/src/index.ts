/**
 * @frontal-labs/ontology
 *
 * Ontology platform client, plus the typed entity layer used by generated
 * `.frontal/client.ts` files.
 */

export {
  createOntologyClient,
  type OntologyClientConfig,
  ontology,
} from "./client";
export { DEFAULT_ONTOLOGY_BASE_URL, VERSION } from "./constants";
export { withEntityHandles } from "./entity-handle";
export type {
  FieldKind,
  FieldSpec,
  OntologyRuntime,
  OntologyRuntimeArgs,
  RelationSpec,
} from "./entity-runtime";
export type {
  EntityCreate,
  EntityHandle,
  EntityRead,
  EntityRelations,
  EntityUpdate,
  EntityWithRelations,
  OntologyClient,
  OntologyDefinition,
  UntypedOntology,
} from "./entity-types";
export * from "./schemas";
export { OntologySdk } from "./sdk";
