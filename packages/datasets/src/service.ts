import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { Dataset, DatasetVersion, DatasetStats } from "./schemas";

export class DatasetsService {
  readonly versions: VersionsNamespace;
  readonly data: DataNamespace;
  readonly stats: StatsNamespace;

  constructor(private readonly http: HttpClient) {
    this.versions = new VersionsNamespace(http);
    this.data = new DataNamespace(http);
    this.stats = new StatsNamespace(http);
  }

  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Dataset>> {
    const raw = await this.http.get("/datasets", opts);
    return createPageResult(asPagePayload<Dataset>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    name: string;
    description?: string;
  }): Promise<Dataset> {
    return this.http.post("/datasets", input);
  }

  async get(id: string): Promise<Dataset> {
    return this.http.get(`/datasets/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string }
  ): Promise<Dataset> {
    return this.http.put(`/datasets/${id}`, input);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/datasets/${id}`);
  }
}

export class VersionsNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(datasetId: string): Promise<{ data: DatasetVersion[] }> {
    return this.http.get(`/datasets/${datasetId}/versions`);
  }
  async get(datasetId: string, versionId: string): Promise<DatasetVersion> {
    return this.http.get(`/datasets/${datasetId}/versions/${versionId}`);
  }
  async create(datasetId: string): Promise<DatasetVersion> {
    return this.http.post(`/datasets/${datasetId}/versions`, {});
  }
  async compare(
    datasetId: string,
    v1: string,
    v2: string
  ): Promise<{ additions: number; deletions: number; changes: number }> {
    return this.http.get(`/datasets/${datasetId}/versions/compare`, {
      v1,
      v2,
    });
  }
  async rollback(datasetId: string, versionId: string): Promise<Dataset> {
    return this.http.post(
      `/datasets/${datasetId}/versions/${versionId}/rollback`,
      {}
    );
  }
}

export class DataNamespace {
  constructor(private readonly http: HttpClient) {}
  async query(
    datasetId: string,
    input: { where?: Record<string, unknown>; limit?: number; offset?: number }
  ): Promise<{ data: Record<string, unknown>[] }> {
    return this.http.post(`/datasets/${datasetId}/query`, input);
  }
  async insert(
    datasetId: string,
    rows: Record<string, unknown>[]
  ): Promise<{ inserted: number }> {
    return this.http.post(`/datasets/${datasetId}/data`, { rows });
  }
  async upsert(
    datasetId: string,
    rows: Record<string, unknown>[],
    key: string
  ): Promise<{ inserted: number; updated: number }> {
    return this.http.put(`/datasets/${datasetId}/data`, { rows, key });
  }
  async delete(
    datasetId: string,
    where: Record<string, unknown>
  ): Promise<{ deleted: number }> {
    return this.http.delete(`/datasets/${datasetId}/data`, where);
  }
}

export class StatsNamespace {
  constructor(private readonly http: HttpClient) {}
  async get(datasetId: string): Promise<DatasetStats> {
    return this.http.get(`/datasets/${datasetId}/stats`);
  }
}
