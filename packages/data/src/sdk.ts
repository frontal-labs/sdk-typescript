import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "frontal/core";

/**
 * Client for the Frontal Data platform's processing subdomains
 * (`/v1/data/*`), each a distinct backend service that shares a common
 * `capabilities`/`health`/`info`/`runs` envelope.
 *
 * Datasets (ingest + catalog), pipelines, and lineage have dedicated packages
 * (`@frontal-labs/datasets`, `@frontal-labs/pipelines`, `@frontal-labs/lineage`);
 * this package covers the remaining subdomains.
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class DataSdk {
  /** Aggregation management subdomain. */
  readonly aggregations: AggregationsNamespace;
  /** Archival policy subdomain. */
  readonly archival: ArchivalNamespace;
  /** Enrichment profile subdomain. */
  readonly enrichment: EnrichmentNamespace;
  /** Data export subdomain. */
  readonly exports: ExportsNamespace;
  /** Normalization profile subdomain. */
  readonly normalization: NormalizationNamespace;
  /** Data quality ruleset subdomain. */
  readonly quality: QualityNamespace;
  /** Serving product subdomain. */
  readonly serving: ServingNamespace;
  /** Stream management subdomain. */
  readonly streams: StreamsNamespace;
  /** Sync job subdomain. */
  readonly sync: SyncNamespace;
  /** Transformation subdomain. */
  readonly transformations: TransformationsNamespace;
  /** Federated query subdomain. */
  readonly query: QueryNamespace;
  /** Schema registry subdomain. */
  readonly schemas: SchemasNamespace;

  /**
   * @param http - The shared HTTP client used for all subdomain requests.
   */
  constructor(http: HttpClient) {
    this.aggregations = new AggregationsNamespace(http);
    this.archival = new ArchivalNamespace(http);
    this.enrichment = new EnrichmentNamespace(http);
    this.exports = new ExportsNamespace(http);
    this.normalization = new NormalizationNamespace(http);
    this.quality = new QualityNamespace(http);
    this.serving = new ServingNamespace(http);
    this.streams = new StreamsNamespace(http);
    this.sync = new SyncNamespace(http);
    this.transformations = new TransformationsNamespace(http);
    this.query = new QueryNamespace(http);
    this.schemas = new SchemasNamespace(http);
  }
}

type Body = Record<string, unknown>;
interface ListOpts {
  limit?: number;
  cursor?: string;
  [key: string]: unknown;
}
type Obj = Record<string, unknown>;

/**
 * Shared behaviour for every data subdomain: capability/health/info probes and
 * the asynchronous `runs` collection.
 */
export class SubdomainBase {
  /**
   * @param http - The shared HTTP client.
   * @param base - The subdomain base path (e.g. `/data/aggregations`).
   */
  constructor(
    protected readonly http: HttpClient,
    protected readonly base: string
  ) {}

  /** List available capabilities for this subdomain. */
  capabilities(): Promise<Obj> {
    return this.http.get(`${this.base}/capabilities`);
  }
  /** Health check for this subdomain. */
  health(): Promise<Obj> {
    return this.http.get(`${this.base}/health`);
  }
  /** Metadata about this subdomain service. */
  info(): Promise<Obj> {
    return this.http.get(`${this.base}/info`);
  }
  /** List asynchronous runs, with optional cursor-based pagination. */
  async runs(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(`${this.base}/runs`, opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.runs({ ...opts, cursor: c })
    );
  }
  /** Create a new asynchronous run. */
  createRun(input: Body): Promise<Obj> {
    return this.http.post(`${this.base}/runs`, input);
  }
  /** Get a single run by its ID. */
  run(runId: string): Promise<Obj> {
    return this.http.get(`${this.base}/runs/${runId}`);
  }
}

/** Aggregation management subdomain (`/data/aggregations`). */
export class AggregationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/aggregations");
  }
  /** List all aggregation definitions. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/aggregations/aggregations", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new aggregation definition. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/aggregations/aggregations", body);
  }
  /** Get a single aggregation definition by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/aggregations/aggregations/${id}`);
  }
  /** Execute an aggregation and return a run result. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/aggregations/aggregations/${id}/executions`,
      body
    );
  }
}

/** Archival policy subdomain (`/data/archival`). */
export class ArchivalNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/archival");
  }
  /** List all archival policies. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/archival/archival/policies", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new archival policy. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/archival/archival/policies", body);
  }
  /** Get a single archival policy by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/archival/archival/policies/${id}`);
  }
  /** Execute an archival policy. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/archival/archival/policies/${id}/executions`,
      body
    );
  }
}

/** Enrichment profile subdomain (`/data/enrichment`). */
export class EnrichmentNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/enrichment");
  }
  /** List all enrichment profiles. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/enrichment/enrichment/profiles",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new enrichment profile. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/enrichment/enrichment/profiles", body);
  }
  /** Get a single enrichment profile by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/enrichment/enrichment/profiles/${id}`);
  }
  /** Execute an enrichment profile. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/enrichment/enrichment/profiles/${id}/executions`,
      body
    );
  }
}

/** Data export subdomain (`/data/exports`). */
export class ExportsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/exports");
  }
  /** List all exports. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/exports/exports", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new export job. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/exports/exports", body);
  }
  /** Get a single export by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/exports/exports/${id}`);
  }
  /** Execute an export job. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/exports/exports/${id}/executions`, body);
  }
}

/** Normalization profile subdomain (`/data/normalization`). */
export class NormalizationNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/normalization");
  }
  /** List all normalization profiles. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/normalization/normalization/profiles",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new normalization profile. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/normalization/normalization/profiles", body);
  }
  /** Get a single normalization profile by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/normalization/normalization/profiles/${id}`);
  }
  /** Execute a normalization profile. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/normalization/normalization/profiles/${id}/executions`,
      body
    );
  }
}

/** Data quality ruleset subdomain (`/data/quality`). */
export class QualityNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/quality");
  }
  /** List all quality rulesets. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/quality/quality/rulesets", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new quality ruleset. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/quality/quality/rulesets", body);
  }
  /** Get a single quality ruleset by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/quality/quality/rulesets/${id}`);
  }
  /** Evaluate a ruleset. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/quality/quality/rulesets/${id}/evaluations`,
      body
    );
  }
}

/** Serving product subdomain (`/data/serving`). */
export class ServingNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/serving");
  }
  /** List all serving products. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/serving/serving/products", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new serving product. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/serving/serving/products", body);
  }
  /** Get a single serving product by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/serving/serving/products/${id}`);
  }
  /** Refresh a serving product. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/serving/serving/products/${id}/refreshes`,
      body
    );
  }
}

/** Stream management subdomain (`/data/streams`). */
export class StreamsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/streams");
  }
  /** List all streams. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/streams/streams", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new stream. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/streams/streams", body);
  }
  /** Get a single stream by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/streams/streams/${id}`);
  }
  /** Trigger deliveries for a stream. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/streams/streams/${id}/deliveries`, body);
  }
}

/** Sync job subdomain (`/data/sync`). */
export class SyncNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/sync");
  }
  /** List all sync jobs. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/sync/sync/jobs", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new sync job. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/sync/sync/jobs", body);
  }
  /** Get a single sync job by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/sync/sync/jobs/${id}`);
  }
  /** Execute a sync job. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/sync/sync/jobs/${id}/executions`, body);
  }
}

/** Transformation subdomain (`/data/transformations`). */
export class TransformationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/transformations");
  }
  /** List all transformations. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/transformations/transformations",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Create a new transformation. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/transformations/transformations", body);
  }
  /** Get a single transformation by ID. */
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/transformations/transformations/${id}`);
  }
  /** Execute a transformation. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/transformations/transformations/${id}/executions`,
      body
    );
  }
}

/** Federated query subdomain (`/data/query`). */
export class QueryNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/query");
  }
  /** Execute a federated query across multiple data sources. */
  federated(body: Body): Promise<Obj> {
    return this.http.post("/data/query/query/federated", body);
  }
}

/** Data schema registry subdomain (`/data/schemas`). */
export class SchemasNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/schemas");
  }
  /** List all registered schemas. */
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/schemas/schemas", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  /** Register a new schema. */
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/schemas/schemas", body);
  }
  /** Resolve a schema reference to its definition. */
  resolve(body: Body): Promise<Obj> {
    return this.http.post("/data/schemas/schemas/resolve", body);
  }
  /** Get a registered schema by reference. */
  get(schemaRef: string): Promise<Obj> {
    return this.http.get(`/data/schemas/schemas/${schemaRef}`);
  }
}
