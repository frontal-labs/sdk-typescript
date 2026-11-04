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
  BelongsToSpec,
  FieldKind,
  FieldSpec,
  OntologyRuntime,
  OntologyRuntimeArgs,
  RelationSpec,
  TraversalSpec,
} from "./entity-runtime";
export type {
  BooleanFilter,
  EntityCreate,
  EntityHandle,
  EntityPage,
  EntityRead,
  EntityRelations,
  EntityUpdate,
  EntityWhere,
  EntityWithRelations,
  EnumFilter,
  FilterFor,
  NumberFilter,
  OntologyClient,
  OntologyDefinition,
  QueryOptions,
  StringFilter,
  UntypedOntology,
} from "./entity-types";
export * from "./schemas";
export { OntologySdk } from "./sdk";
