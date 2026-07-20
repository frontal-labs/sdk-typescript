import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/_core";

/**
 * Client for the Frontal OntologySdk API (`/v1/ontology/*`).
 *
 * The ontology platform is composed of independent subdomain services that
 * share a common envelope (`capabilities`, `health`, `info`, and asynchronous
 * `runs`). Each subdomain is exposed as a namespace on {@link OntologySdk}.
 * The `graph` subdomain is served by the dedicated `@frontal-labs/graph`
 * package and is intentionally not duplicated here.
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class OntologySdk {
  readonly engine: EngineNamespace;
  readonly objects: ObjectsNamespace;
  readonly relationships: RelationshipsNamespace;
  readonly schemas: SchemasNamespace;
  readonly versions: VersionsNamespace;
  readonly validation: ValidationNamespace;
  readonly transformations: TransformationsNamespace;
  readonly reasoning: ReasoningNamespace;
  readonly rollouts: RolloutsNamespace;
  readonly rollups: RollupsNamespace;
  readonly extract: ExtractNamespace;
  readonly events: EventsNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(http: HttpClient) {
    this.engine = new EngineNamespace(http);
    this.objects = new ObjectsNamespace(http);
    this.relationships = new RelationshipsNamespace(http);
    this.schemas = new SchemasNamespace(http);
    this.versions = new VersionsNamespace(http);
    this.validation = new ValidationNamespace(http);
    this.transformations = new TransformationsNamespace(http);
    this.reasoning = new ReasoningNamespace(http);
    this.rollouts = new RolloutsNamespace(http);
    this.rollups = new RollupsNamespace(http);
    this.extract = new ExtractNamespace(http);
    this.events = new EventsNamespace(http);
  }
}

/** Generic request body type for API calls. */
type Body = Record<string, unknown>;

/** Options for paginated list operations. */
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Shared behaviour for every ontology subdomain: capability/health/info probes
 * and the asynchronous `runs` collection.
 */
/**
 * Shared base class for every ontology subdomain namespace.
 * Provides capability/health/info probes and async run management.
 */
abstract class SubdomainBase {
  protected constructor(
    protected readonly http: HttpClient,
    protected readonly base: string
  ) {}

  /**
   * Returns the capabilities of this subdomain service.
   */
  capabilities(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/capabilities`);
  }
  /**
   * Health check for this subdomain service.
   */
  health(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/health`);
  }
  /**
   * Returns service info/metadata for this subdomain service.
   */
  info(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/info`);
  }

  /**
   * Lists asynchronous runs for this subdomain.
   * @param opts - Pagination options.
   */
  async runs(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get(`${this.base}/runs`, opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.runs({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a new asynchronous run.
   * @param input - The run input payload.
   */
  createRun(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(`${this.base}/runs`, input);
  }
  /**
   * Fetches an asynchronous run by ID.
   * @param runId - The run ID.
   */
  run(runId: string): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/runs/${runId}`);
  }
}

/**
 * Engine subdomain: ontology generation, validation, export, and inference.
 */
export class EngineNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/engine");
  }
  /**
   * Generates an ontology from a description.
   * @param input - Generation parameters.
   */
  generate(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/generate", input);
  }
  /**
   * Validates an ontology definition.
   * @param input - The ontology to validate.
   */
  validate(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/validate", input);
  }
  /**
   * Exports an ontology in a standard format.
   * @param input - Export parameters.
   */
  export(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/export", input);
  }
  /**
   * Exports an ontology as SHACL shapes.
   * @param input - Export parameters.
   */
  exportShacl(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/export-shacl", input);
  }
  /**
   * Infers class definitions from source data.
   * @param input - Inference parameters.
   */
  inferClasses(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/infer-classes", input);
  }
  /**
   * Infers property definitions from source data.
   * @param input - Inference parameters.
   */
  inferProperties(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(
      "/ontology/engine/ontologies/infer-properties",
      input
    );
  }
  /**
   * Compares two ontology versions.
   * @param input - Comparison parameters (fromVersion, toVersion).
   */
  compareVersions(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(
      "/ontology/engine/ontologies/compare-versions",
      input
    );
  }
}

/**
 * Objects subdomain: CRUD for object types and object instances.
 */
export class ObjectsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/objects");
  }
  /**
   * Lists object types with pagination.
   * @param opts - Pagination options.
   */
  async listObjectTypes(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/objects/object-types", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listObjectTypes({ ...opts, cursor: c })
    );
  }
  /**
   * Fetches an object type by ID.
   * @param id - The object type ID.
   */
  getObjectType(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/objects/object-types/${id}`);
  }
  /**
   * Creates or updates an object type.
   * @param id - The object type ID.
   * @param body - The object type definition.
   */
  putObjectType(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/objects/object-types/${id}`, body);
  }
  /**
   * Deletes an object type.
   * @param id - The object type ID.
   */
  deleteObjectType(id: string): Promise<void> {
    return this.http.delete(`/ontology/objects/object-types/${id}`);
  }
  /**
   * Lists object instances with pagination.
   * @param opts - Pagination options.
   */
  async listObjects(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/objects/objects", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listObjects({ ...opts, cursor: c })
    );
  }
  /**
   * Fetches an object instance by ID.
   * @param id - The object ID.
   */
  getObject(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/objects/objects/${id}`);
  }
  /**
   * Creates or updates an object instance.
   * @param id - The object ID.
   * @param body - The object data.
   */
  putObject(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/objects/objects/${id}`, body);
  }
  /**
   * Deletes an object instance.
   * @param id - The object ID.
   */
  deleteObject(id: string): Promise<void> {
    return this.http.delete(`/ontology/objects/objects/${id}`);
  }
}

/**
 * Relationships subdomain: CRUD for relationship types and instances.
 */
export class RelationshipsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/relationships");
  }
  /**
   * Lists relationship types with pagination.
   * @param opts - Pagination options.
   */
  async listTypes(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get(
      "/ontology/relationships/relationship-types",
      opts
    );
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listTypes({ ...opts, cursor: c })
    );
  }
  /**
   * Deletes a relationship type.
   * @param id - The relationship type ID.
   */
  deleteType(id: string): Promise<void> {
    return this.http.delete(`/ontology/relationships/relationship-types/${id}`);
  }
  /**
   * Lists relationship instances with pagination.
   * @param opts - Pagination options.
   */
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get(
      "/ontology/relationships/relationships",
      opts
    );
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /**
   * Fetches a relationship instance by ID.
   * @param id - The relationship ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/relationships/relationships/${id}`);
  }
  /**
   * Creates or updates a relationship instance.
   * @param id - The relationship ID.
   * @param body - The relationship data.
   */
  put(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/relationships/relationships/${id}`, body);
  }
  /**
   * Deletes a relationship instance.
   * @param id - The relationship ID.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/relationships/relationships/${id}`);
  }
}

/**
 * Schemas subdomain: manage schema (model) definitions.
 */
export class SchemasNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/schemas");
  }
  /**
   * Lists schema definitions with pagination.
   * @param opts - Pagination options.
   */
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/schemas/schemas", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a new schema definition.
   * @param body - The schema definition.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/schemas/schemas", body);
  }
  /**
   * Validates a schema definition.
   * @param body - The schema to validate.
   */
  validate(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/schemas/schemas/validate", body);
  }
  /**
   * Fetches a schema definition by ID.
   * @param id - The schema ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/schemas/schemas/${id}`);
  }
  /**
   * Deletes a schema definition.
   * @param id - The schema ID.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/schemas/schemas/${id}`);
  }
}

/**
 * Versions subdomain: version management, comparison, and release bundles.
 */
export class VersionsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/versions");
  }
  /**
   * Creates a new version.
   * @param body - Version creation payload.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/versions", body);
  }
  /**
   * Compares two versions.
   * @param body - Comparison parameters.
   */
  compare(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/versions/compare", body);
  }
  /**
   * Fetches a version by ID.
   * @param id - The version ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/versions/versions/${id}`);
  }
  /**
   * Deletes a version.
   * @param id - The version ID.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/versions/versions/${id}`);
  }
  /**
   * Verifies an audit trail for a version.
   * @param body - Audit verification payload.
   */
  auditVerify(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/audit/verify", body);
  }
  /**
   * Lists release bundles with pagination.
   * @param opts - Pagination options.
   */
  async listReleaseBundles(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/versions/release-bundles", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listReleaseBundles({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a new release bundle.
   * @param body - Release bundle payload.
   */
  createReleaseBundle(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/release-bundles", body);
  }
  /**
   * Fetches a release bundle by ID.
   * @param id - The release bundle ID.
   */
  getReleaseBundle(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/versions/release-bundles/${id}`);
  }
}

/**
 * Validation subdomain: payload validation and rule management.
 */
export class ValidationNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/validation");
  }
  /**
   * Validates a payload against a schema.
   * @param body - The payload to validate.
   */
  validatePayload(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/validation/payloads/validate", body);
  }
  /**
   * Lists validation rules with pagination.
   * @param opts - Pagination options.
   */
  async listRules(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/validation/rules", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listRules({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a validation rule.
   * @param body - The rule definition.
   */
  createRule(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/validation/rules", body);
  }
  /**
   * Fetches a validation rule by ID.
   * @param id - The rule ID.
   */
  getRule(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/validation/rules/${id}`);
  }
  /**
   * Deletes a validation rule.
   * @param id - The rule ID.
   */
  deleteRule(id: string): Promise<void> {
    return this.http.delete(`/ontology/validation/rules/${id}`);
  }
}

/**
 * Transformations subdomain: data transformation management.
 */
export class TransformationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/transformations");
  }
  /**
   * Creates a data transformation.
   * @param body - The transformation definition.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/transformations/transformations", body);
  }
}

/**
 * Reasoning subdomain: explainability, facts, and forward/backward chaining.
 */
export class ReasoningNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/reasoning");
  }
  /**
   * Generates an explanation for a reasoning result.
   * @param body - Explanation request.
   */
  explain(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/explain", body);
  }
  /**
   * Retrieves facts based on criteria.
   * @param body - Fact query parameters.
   */
  facts(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/facts", body);
  }
  /**
   * Loads facts into the reasoning graph.
   * @param body - Facts graph data.
   */
  loadFactsGraph(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/facts/load-graph", body);
  }
  /**
   * Performs forward chaining reasoning.
   * @param body - Forward reasoning parameters.
   */
  reasonForward(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/reason/forward", body);
  }
  /**
   * Performs backward chaining reasoning.
   * @param body - Backward reasoning parameters.
   */
  reasonBackward(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/reason/backward", body);
  }
  /**
   * Lists reasoning rules with pagination.
   * @param opts - Pagination options.
   */
  async listRules(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/reasoning/rules", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listRules({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a reasoning rule.
   * @param body - The rule definition.
   */
  createRule(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/rules", body);
  }
  /**
   * Updates a reasoning rule.
   * @param id - The rule ID.
   * @param body - The updated rule fields.
   */
  updateRule(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/reasoning/rules/${id}`, body);
  }
  /**
   * Deletes a reasoning rule.
   * @param id - The rule ID.
   */
  deleteRule(id: string): Promise<void> {
    return this.http.delete(`/ontology/reasoning/rules/${id}`);
  }
}

/**
 * Rollouts subdomain: manage rollout campaigns (create, pause, resume, rollback).
 */
export class RolloutsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/rollouts");
  }
  /**
   * Lists rollouts with pagination.
   * @param opts - Pagination options.
   */
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/rollouts/rollouts", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a new rollout.
   * @param body - Rollout configuration.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/rollouts/rollouts", body);
  }
  /**
   * Fetches a rollout by ID.
   * @param id - The rollout ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollouts/rollouts/${id}`);
  }
  /**
   * Updates a rollout.
   * @param id - The rollout ID.
   * @param body - The updated rollout fields.
   */
  update(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/rollouts/rollouts/${id}`, body);
  }
  /**
   * Deletes a rollout.
   * @param id - The rollout ID.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/rollouts/rollouts/${id}`);
  }
  /**
   * Starts a rollout.
   * @param id - The rollout ID.
   * @param body - Start parameters.
   */
  start(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/start`, body);
  }
  /**
   * Pauses a rollout.
   * @param id - The rollout ID.
   * @param body - Pause parameters.
   */
  pause(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/pause`, body);
  }
  /**
   * Resumes a paused rollout.
   * @param id - The rollout ID.
   * @param body - Resume parameters.
   */
  resume(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/resume`, body);
  }
  /**
   * Rolls back a rollout.
   * @param id - The rollout ID.
   * @param body - Rollback parameters.
   */
  rollback(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/rollback`, body);
  }
  /**
   * Returns the current status of a rollout.
   * @param id - The rollout ID.
   */
  status(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollouts/rollouts/${id}/status`);
  }
}

/**
 * Rollups subdomain: data rollup/aggregation jobs.
 */
export class RollupsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/rollups");
  }
  /**
   * Lists rollups with pagination.
   * @param opts - Pagination options.
   */
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/rollups/rollups", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a rollup job.
   * @param body - Rollup configuration.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/rollups/rollups", body);
  }
  /**
   * Fetches a rollup by ID.
   * @param id - The rollup ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollups/${id}`);
  }
  /**
   * Updates a rollup.
   * @param id - The rollup ID.
   * @param body - The updated rollup fields.
   */
  update(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/rollups/rollups/${id}`, body);
  }
  /**
   * Deletes a rollup.
   * @param id - The rollup ID.
   */
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/rollups/rollups/${id}`);
  }
  /**
   * Executes a rollup.
   * @param id - The rollup ID.
   * @param body - Execution parameters.
   */
  execute(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollups/rollups/${id}/execute`, body);
  }
  /**
   * Previews a rollup result without persisting it.
   * @param id - The rollup ID.
   * @param body - Preview parameters.
   */
  preview(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollups/rollups/${id}/preview`, body);
  }
  /**
   * Fetches the result of a rollup execution.
   * @param id - The rollup ID.
   */
  result(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollups/${id}/result`);
  }
  /**
   * Fetches the result of a specific rollup execution.
   * @param executionId - The execution ID.
   */
  executionResult(executionId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollup-results/${executionId}`);
  }
}

/**
 * Extract subdomain: extract structured data (entities, events, relations, etc.).
 */
export class ExtractNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/extract");
  }
  /**
   * Analyzes source data for extraction.
   * @param body - Analysis parameters.
   */
  analyze(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/analyze", body);
  }
  /**
   * Extracts architecture from source data.
   * @param body - Architecture extraction parameters.
   */
  architecture(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/architecture", body);
  }
  /**
   * Extracts coreference chains from source data.
   * @param body - Coreference extraction parameters.
   */
  coreferences(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/coreferences", body);
  }
  /**
   * Extracts entities from source data.
   * @param body - Entity extraction parameters.
   */
  entities(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/entities", body);
  }
  /**
   * Extracts events from source data.
   * @param body - Event extraction parameters.
   */
  events(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/events", body);
  }
  /**
   * Extracts relations from source data.
   * @param body - Relation extraction parameters.
   */
  relations(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/relations", body);
  }
  /**
   * Extracts RDF triplets from source data.
   * @param body - Triplet extraction parameters.
   */
  triplets(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/triplets", body);
  }
}

/**
 * Events subdomain: event management and consumer checkpoints.
 */
export class EventsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/events");
  }
  /**
   * Lists events with pagination.
   * @param opts - Pagination options.
   */
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/events/events", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /**
   * Creates a new event.
   * @param body - The event payload.
   */
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events", body);
  }
  /**
   * Fetches an event by ID.
   * @param id - The event ID.
   */
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/events/events/${id}`);
  }
  /**
   * Creates an event checkpoint for a consumer.
   * @param body - Checkpoint data.
   */
  createCheckpoint(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/checkpoints", body);
  }
  /**
   * Fetches the checkpoint for a consumer.
   * @param consumer - The consumer identifier.
   */
  getCheckpoint(consumer: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/events/events/checkpoints/${consumer}`);
  }
  /**
   * Acquires a lease for event processing.
   * @param body - Lease acquisition parameters.
   */
  acquireLease(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/leases/acquire", body);
  }
  /**
   * Acknowledges a lease after processing.
   * @param body - Lease acknowledgment parameters.
   */
  acknowledgeLease(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/leases/acknowledge", body);
  }
}
