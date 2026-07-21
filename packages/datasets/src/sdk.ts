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
  /** Namespace for schema operations. */
  readonly schemas: SchemasNamespace;
  /** Namespace for catalog operations. */
  readonly catalog: CatalogNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.schemas = new SchemasNamespace(http);
    this.catalog = new CatalogNamespace(http);
  }

  /**
   * List datasets known to the ingest service.
   * @param opts - Pagination options (limit and cursor).
   * @returns A paginated list of datasets.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Dataset>> {
    const raw = await this.http.get("/data/ingest/datasets", opts);
    return createPageResult(asPagePayload<Dataset>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Fetch a single dataset by id.
   * @param id - The dataset's unique identifier.
   * @returns The dataset.
   */
  async get(id: string): Promise<Dataset> {
    return this.http.get(`/data/ingest/datasets/${id}`);
  }

  /**
   * Download the content of a dataset artifact manifest.
   * @param datasetId - The dataset's unique identifier.
   * @param manifestId - The manifest's unique identifier.
   * @returns The raw Response for streaming or parsing.
   */
  async getArtifactContent(
    datasetId: string,
    manifestId: string
  ): Promise<Response> {
    return this.http.getRaw(
      `/data/ingest/datasets/${datasetId}/artifacts/${manifestId}/content`
    );
  }

  /**
   * Submit an ingestion request that creates or appends to a dataset.
   * @param input - The ingestion payload including dataset, source, schema ref, and data.
   * @returns The ingestion run ID and any additional metadata.
   */
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

/** Namespace for dataset schema operations. */
export class SchemasNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List available dataset schemas.
   * @param opts - Pagination options.
   * @returns A paginated list of schema references.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<DatasetSchemaRef>> {
    const raw = await this.http.get("/data/ingest/schemas", opts);
    return createPageResult(asPagePayload<DatasetSchemaRef>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Resolve a schema by its reference.
   * @param schemaRef - The schema reference identifier.
   * @returns The schema reference with definition.
   */
  async get(schemaRef: string): Promise<DatasetSchemaRef> {
    return this.http.get(`/data/ingest/schemas/${schemaRef}`);
  }
}

/** Namespace for catalog operations. */
export class CatalogNamespace {
  /** Namespace for catalog dataset operations. */
  readonly datasets: CatalogDatasetsNamespace;
  /** Namespace for catalog source operations. */
  readonly sources: CatalogSourcesNamespace;
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(http: HttpClient) {
    this.datasets = new CatalogDatasetsNamespace(http);
    this.sources = new CatalogSourcesNamespace(http);
  }
}

/** Namespace for catalog dataset operations. */
export class CatalogDatasetsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List catalog datasets.
   * @param opts - Pagination options.
   * @returns A paginated list of datasets.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Dataset>> {
    const raw = await this.http.get("/data/catalog/catalog/datasets", opts);
    return createPageResult(asPagePayload<Dataset>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Get a catalog dataset by ID.
   * @param id - The dataset's unique identifier.
   * @returns The dataset.
   */
  async get(id: string): Promise<Dataset> {
    return this.http.get(`/data/catalog/catalog/datasets/${id}`);
  }
  /**
   * Download artifact content for a catalog dataset.
   * @param datasetId - The dataset's unique identifier.
   * @param manifestId - The manifest's unique identifier.
   * @returns The raw Response for streaming or parsing.
   */
  async getArtifactContent(
    datasetId: string,
    manifestId: string
  ): Promise<Response> {
    return this.http.getRaw(
      `/data/catalog/catalog/datasets/${datasetId}/artifacts/${manifestId}/content`
    );
  }
}

/** Namespace for catalog source operations. */
export class CatalogSourcesNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}
  /**
   * List catalog sources.
   * @param opts - Pagination options.
   * @returns A paginated list of catalog sources.
   */
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<CatalogSource>> {
    const raw = await this.http.get("/data/catalog/catalog/sources", opts);
    return createPageResult(asPagePayload<CatalogSource>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  /**
   * Get a catalog source by ID.
   * @param id - The source's unique identifier.
   * @returns The catalog source.
   */
  async get(id: string): Promise<CatalogSource> {
    return this.http.get(`/data/catalog/catalog/sources/${id}`);
  }
}
