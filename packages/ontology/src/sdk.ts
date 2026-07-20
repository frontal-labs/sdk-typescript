import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";

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

type Body = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Shared behaviour for every ontology subdomain: capability/health/info probes
 * and the asynchronous `runs` collection.
 */
abstract class SubdomainBase {
  protected constructor(
    protected readonly http: HttpClient,
    protected readonly base: string
  ) {}

  capabilities(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/capabilities`);
  }
  health(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/health`);
  }
  info(): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/info`);
  }

  async runs(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get(`${this.base}/runs`, opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.runs({ ...opts, cursor: c })
    );
  }
  createRun(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(`${this.base}/runs`, input);
  }
  run(runId: string): Promise<Record<string, unknown>> {
    return this.http.get(`${this.base}/runs/${runId}`);
  }
}

export class EngineNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/engine");
  }
  generate(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/generate", input);
  }
  validate(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/validate", input);
  }
  export(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/export", input);
  }
  exportShacl(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/export-shacl", input);
  }
  inferClasses(input: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/engine/ontologies/infer-classes", input);
  }
  inferProperties(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(
      "/ontology/engine/ontologies/infer-properties",
      input
    );
  }
  compareVersions(input: Body): Promise<Record<string, unknown>> {
    return this.http.post(
      "/ontology/engine/ontologies/compare-versions",
      input
    );
  }
}

export class ObjectsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/objects");
  }
  async listObjectTypes(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/objects/object-types", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listObjectTypes({ ...opts, cursor: c })
    );
  }
  getObjectType(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/objects/object-types/${id}`);
  }
  putObjectType(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/objects/object-types/${id}`, body);
  }
  deleteObjectType(id: string): Promise<void> {
    return this.http.delete(`/ontology/objects/object-types/${id}`);
  }
  async listObjects(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/objects/objects", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listObjects({ ...opts, cursor: c })
    );
  }
  getObject(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/objects/objects/${id}`);
  }
  putObject(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/objects/objects/${id}`, body);
  }
  deleteObject(id: string): Promise<void> {
    return this.http.delete(`/ontology/objects/objects/${id}`);
  }
}

export class RelationshipsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/relationships");
  }
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
  deleteType(id: string): Promise<void> {
    return this.http.delete(`/ontology/relationships/relationship-types/${id}`);
  }
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
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/relationships/relationships/${id}`);
  }
  put(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/relationships/relationships/${id}`, body);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/relationships/relationships/${id}`);
  }
}

export class SchemasNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/schemas");
  }
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/schemas/schemas", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/schemas/schemas", body);
  }
  validate(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/schemas/schemas/validate", body);
  }
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/schemas/schemas/${id}`);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/schemas/schemas/${id}`);
  }
}

export class VersionsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/versions");
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/versions", body);
  }
  compare(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/versions/compare", body);
  }
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/versions/versions/${id}`);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/versions/versions/${id}`);
  }
  auditVerify(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/audit/verify", body);
  }
  async listReleaseBundles(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/versions/release-bundles", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listReleaseBundles({ ...opts, cursor: c })
    );
  }
  createReleaseBundle(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/versions/release-bundles", body);
  }
  getReleaseBundle(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/versions/release-bundles/${id}`);
  }
}

export class ValidationNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/validation");
  }
  validatePayload(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/validation/payloads/validate", body);
  }
  async listRules(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/validation/rules", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listRules({ ...opts, cursor: c })
    );
  }
  createRule(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/validation/rules", body);
  }
  getRule(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/validation/rules/${id}`);
  }
  deleteRule(id: string): Promise<void> {
    return this.http.delete(`/ontology/validation/rules/${id}`);
  }
}

export class TransformationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/transformations");
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/transformations/transformations", body);
  }
}

export class ReasoningNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/reasoning");
  }
  explain(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/explain", body);
  }
  facts(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/facts", body);
  }
  loadFactsGraph(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/facts/load-graph", body);
  }
  reasonForward(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/reason/forward", body);
  }
  reasonBackward(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/reason/backward", body);
  }
  async listRules(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/reasoning/rules", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.listRules({ ...opts, cursor: c })
    );
  }
  createRule(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/reasoning/rules", body);
  }
  updateRule(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/reasoning/rules/${id}`, body);
  }
  deleteRule(id: string): Promise<void> {
    return this.http.delete(`/ontology/reasoning/rules/${id}`);
  }
}

export class RolloutsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/rollouts");
  }
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/rollouts/rollouts", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/rollouts/rollouts", body);
  }
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollouts/rollouts/${id}`);
  }
  update(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/rollouts/rollouts/${id}`, body);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/rollouts/rollouts/${id}`);
  }
  start(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/start`, body);
  }
  pause(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/pause`, body);
  }
  resume(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/resume`, body);
  }
  rollback(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollouts/rollouts/${id}/rollback`, body);
  }
  status(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollouts/rollouts/${id}/status`);
  }
}

export class RollupsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/rollups");
  }
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/rollups/rollups", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/rollups/rollups", body);
  }
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollups/${id}`);
  }
  update(id: string, body: Body): Promise<Record<string, unknown>> {
    return this.http.put(`/ontology/rollups/rollups/${id}`, body);
  }
  delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/rollups/rollups/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollups/rollups/${id}/execute`, body);
  }
  preview(id: string, body: Body = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/ontology/rollups/rollups/${id}/preview`, body);
  }
  result(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollups/${id}/result`);
  }
  executionResult(executionId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/rollups/rollup-results/${executionId}`);
  }
}

export class ExtractNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/extract");
  }
  analyze(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/analyze", body);
  }
  architecture(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/architecture", body);
  }
  coreferences(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/coreferences", body);
  }
  entities(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/entities", body);
  }
  events(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/events", body);
  }
  relations(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/relations", body);
  }
  triplets(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/extract/extract/triplets", body);
  }
}

export class EventsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/ontology/events");
  }
  async list(
    opts: ListOpts = {}
  ): Promise<PageResult<Record<string, unknown>>> {
    const raw = await this.http.get("/ontology/events/events", opts);
    return createPageResult(asPagePayload<Record<string, unknown>>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events", body);
  }
  get(id: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/events/events/${id}`);
  }
  createCheckpoint(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/checkpoints", body);
  }
  getCheckpoint(consumer: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/events/events/checkpoints/${consumer}`);
  }
  acquireLease(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/leases/acquire", body);
  }
  acknowledgeLease(body: Body): Promise<Record<string, unknown>> {
    return this.http.post("/ontology/events/events/leases/acknowledge", body);
  }
}
