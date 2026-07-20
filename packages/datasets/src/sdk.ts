import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import type { CatalogSource, Dataset, DatasetSchemaRef } from "./schemas";

/**
 * Client for the Frontal Data platform's dataset surfaces.
 *
 * DatasetsSdk are served by two backend services behind the gateway:
 *  - **ingest** (`/v1/data/ingest/*`) — list/read datasets, read artifact
 *    content, resolve schemas, and submit ingestion runs.
 *  - **catalog** (`/v1/data/catalog/*`) — browse catalog datasets and sources.
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class DatasetsSdk {
  readonly schemas: SchemasNamespace;
  readonly catalog: CatalogNamespace;

  constructor(private readonly http: HttpClient) {
    this.schemas = new SchemasNamespace(http);
    this.catalog = new CatalogNamespace(http);
  }

  /** List datasets known to the ingest service. */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Dataset>> {
    const raw = await this.http.get("/data/ingest/datasets", opts);
    return createPageResult(asPagePayload<Dataset>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /** Fetch a single dataset by id. */
  async get(id: string): Promise<Dataset> {
    return this.http.get(`/data/ingest/datasets/${id}`);
  }

  /**
   * Download the content of a dataset artifact manifest.
   * Returns the raw {@link Response} so callers can stream or parse as needed.
   */
  async getArtifactContent(
    datasetId: string,
    manifestId: string
  ): Promise<Response> {
    return this.http.getRaw(
      `/data/ingest/datasets/${datasetId}/artifacts/${manifestId}/content`
    );
  }

  /** Submit an ingestion request that creates or appends to a dataset. */
  async ingest(input: {
    dataset?: string;
    source?: string;
    schemaRef?: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<{ runId: string } & Record<string, unknown>> {
    return this.http.post("/data/ingest/datasets/ingest", input);
  }
}

export class SchemasNamespace {
  constructor(private readonly http: HttpClient) {}
  /** List available dataset schemas. */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<DatasetSchemaRef>> {
    const raw = await this.http.get("/data/ingest/schemas", opts);
    return createPageResult(asPagePayload<DatasetSchemaRef>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /** Resolve a schema by its reference. */
  async get(schemaRef: string): Promise<DatasetSchemaRef> {
    return this.http.get(`/data/ingest/schemas/${schemaRef}`);
  }
}

export class CatalogNamespace {
  readonly datasets: CatalogDatasetsNamespace;
  readonly sources: CatalogSourcesNamespace;
  constructor(http: HttpClient) {
    this.datasets = new CatalogDatasetsNamespace(http);
    this.sources = new CatalogSourcesNamespace(http);
  }
}

export class CatalogDatasetsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Dataset>> {
    const raw = await this.http.get("/data/catalog/catalog/datasets", opts);
    return createPageResult(asPagePayload<Dataset>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<Dataset> {
    return this.http.get(`/data/catalog/catalog/datasets/${id}`);
  }
  async getArtifactContent(
    datasetId: string,
    manifestId: string
  ): Promise<Response> {
    return this.http.getRaw(
      `/data/catalog/catalog/datasets/${datasetId}/artifacts/${manifestId}/content`
    );
  }
}

export class CatalogSourcesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<CatalogSource>> {
    const raw = await this.http.get("/data/catalog/catalog/sources", opts);
    return createPageResult(asPagePayload<CatalogSource>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async get(id: string): Promise<CatalogSource> {
    return this.http.get(`/data/catalog/catalog/sources/${id}`);
  }
}
