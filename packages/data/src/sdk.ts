import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";

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
  readonly aggregations: AggregationsNamespace;
  readonly archival: ArchivalNamespace;
  readonly enrichment: EnrichmentNamespace;
  readonly exports: ExportsNamespace;
  readonly normalization: NormalizationNamespace;
  readonly quality: QualityNamespace;
  readonly serving: ServingNamespace;
  readonly streams: StreamsNamespace;
  readonly sync: SyncNamespace;
  readonly transformations: TransformationsNamespace;
  readonly query: QueryNamespace;
  readonly schemas: SchemasNamespace;

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
  constructor(
    protected readonly http: HttpClient,
    protected readonly base: string
  ) {}

  capabilities(): Promise<Obj> {
    return this.http.get(`${this.base}/capabilities`);
  }
  health(): Promise<Obj> {
    return this.http.get(`${this.base}/health`);
  }
  info(): Promise<Obj> {
    return this.http.get(`${this.base}/info`);
  }
  async runs(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(`${this.base}/runs`, opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.runs({ ...opts, cursor: c })
    );
  }
  createRun(input: Body): Promise<Obj> {
    return this.http.post(`${this.base}/runs`, input);
  }
  run(runId: string): Promise<Obj> {
    return this.http.get(`${this.base}/runs/${runId}`);
  }
}

export class AggregationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/aggregations");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/aggregations/aggregations", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/aggregations/aggregations", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/aggregations/aggregations/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/aggregations/aggregations/${id}/executions`,
      body
    );
  }
}

export class ArchivalNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/archival");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/archival/archival/policies", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/archival/archival/policies", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/archival/archival/policies/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/archival/archival/policies/${id}/executions`,
      body
    );
  }
}

export class EnrichmentNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/enrichment");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/enrichment/enrichment/profiles",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/enrichment/enrichment/profiles", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/enrichment/enrichment/profiles/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/enrichment/enrichment/profiles/${id}/executions`,
      body
    );
  }
}

export class ExportsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/exports");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/exports/exports", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/exports/exports", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/exports/exports/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/exports/exports/${id}/executions`, body);
  }
}

export class NormalizationNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/normalization");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/normalization/normalization/profiles",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/normalization/normalization/profiles", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/normalization/normalization/profiles/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(
      `/data/normalization/normalization/profiles/${id}/executions`,
      body
    );
  }
}

export class QualityNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/quality");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/quality/quality/rulesets", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/quality/quality/rulesets", body);
  }
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

export class ServingNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/serving");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/serving/serving/products", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/serving/serving/products", body);
  }
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

export class StreamsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/streams");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/streams/streams", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/streams/streams", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/streams/streams/${id}`);
  }
  /** Trigger deliveries for a stream. */
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/streams/streams/${id}/deliveries`, body);
  }
}

export class SyncNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/sync");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/sync/sync/jobs", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/sync/sync/jobs", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/sync/sync/jobs/${id}`);
  }
  execute(id: string, body: Body = {}): Promise<Obj> {
    return this.http.post(`/data/sync/sync/jobs/${id}/executions`, body);
  }
}

export class TransformationsNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/transformations");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get(
      "/data/transformations/transformations",
      opts
    );
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/transformations/transformations", body);
  }
  get(id: string): Promise<Obj> {
    return this.http.get(`/data/transformations/transformations/${id}`);
  }
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
  federated(body: Body): Promise<Obj> {
    return this.http.post("/data/query/query/federated", body);
  }
}

/** Data schema registry subdomain (`/data/schemas`). */
export class SchemasNamespace extends SubdomainBase {
  constructor(http: HttpClient) {
    super(http, "/data/schemas");
  }
  async list(opts: ListOpts = {}): Promise<PageResult<Obj>> {
    const raw = await this.http.get("/data/schemas/schemas", opts);
    return createPageResult(asPagePayload<Obj>(raw), (c) =>
      this.list({ ...opts, cursor: c })
    );
  }
  create(body: Body): Promise<Obj> {
    return this.http.post("/data/schemas/schemas", body);
  }
  resolve(body: Body): Promise<Obj> {
    return this.http.post("/data/schemas/schemas/resolve", body);
  }
  get(schemaRef: string): Promise<Obj> {
    return this.http.get(`/data/schemas/schemas/${schemaRef}`);
  }
}
