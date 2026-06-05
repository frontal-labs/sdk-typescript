import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { VectorIndex, VectorSearchResult } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): { data: T[]; pagination: PaginationMeta; meta?: unknown } =>
  raw as { data: T[]; pagination: PaginationMeta; meta?: unknown };

export class VectorsService {
  readonly indexes: IndexesNamespace;
  readonly vectors: VectorsNamespace;
  readonly search: SearchNamespace;

  constructor(private readonly http: HttpClient) {
    this.indexes = new IndexesNamespace(http);
    this.vectors = new VectorsNamespace(http);
    this.search = new SearchNamespace(http);
  }
}

export class IndexesNamespace {
  constructor(private readonly http: HttpClient) {}
  async list(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<VectorIndex>> {
    const raw = await this.http.get("/v1/vectors/indexes", opts);
    return createPageResult(asPagePayload<VectorIndex>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }
  async create(input: {
    name: string;
    dimensions: number;
    metric?: string;
  }): Promise<VectorIndex> {
    return this.http.post("/v1/vectors/indexes", input);
  }
  async get(id: string): Promise<VectorIndex> {
    return this.http.get(`/v1/vectors/indexes/${id}`);
  }
  async update(id: string, input: { name?: string }): Promise<VectorIndex> {
    return this.http.put(`/v1/vectors/indexes/${id}`, input);
  }
  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/vectors/indexes/${id}`);
  }
}

export class VectorsNamespace {
  private dimensionCache = new Map<string, number>();

  constructor(private readonly http: HttpClient) {}

  private async getDimension(indexId: string): Promise<number> {
    const cached = this.dimensionCache.get(indexId);
    if (cached !== undefined) return cached;

    const idx = await new IndexesNamespace(this.http).get(indexId);
    this.dimensionCache.set(indexId, idx.dimensions);
    return idx.dimensions;
  }

  async upsert(
    indexId: string,
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{ inserted: number }> {
    const dims = await this.getDimension(indexId);
    for (let i = 0; i < vectors.length; i++) {
      if (vectors[i].values.length !== dims) {
        throw new Error(
          `Vector ${vectors[i].id}: expected ${dims} dimensions, got ${vectors[i].values.length}`
        );
      }
    }
    return this.http.post(`/v1/vectors/indexes/${indexId}/vectors`, {
      vectors,
    });
  }

  async batchUpsert(
    indexId: string,
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, unknown>;
    }>,
    batchSize: number = 100
  ): Promise<{ inserted: number }> {
    const dims = await this.getDimension(indexId);
    for (let i = 0; i < vectors.length; i++) {
      if (vectors[i].values.length !== dims) {
        throw new Error(
          `Vector ${vectors[i].id}: expected ${dims} dimensions, got ${vectors[i].values.length}`
        );
      }
    }

    let inserted = 0;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const result = await this.http.post<{ inserted: number }>(
        `/v1/vectors/indexes/${indexId}/vectors`,
        { vectors: batch }
      );
      inserted += result.inserted;
    }
    return { inserted };
  }

  async get(indexId: string, vectorId: string): Promise<unknown> {
    return this.http.get(`/v1/vectors/indexes/${indexId}/vectors/${vectorId}`);
  }

  async delete(indexId: string, vectorId: string): Promise<void> {
    return this.http.delete(
      `/v1/vectors/indexes/${indexId}/vectors/${vectorId}`
    );
  }

  async batchDelete(
    indexId: string,
    ids: string[]
  ): Promise<{ deleted: number }> {
    return this.http.post(
      `/v1/vectors/indexes/${indexId}/vectors/batch-delete`,
      { ids }
    );
  }
}

export class SearchNamespace {
  constructor(private readonly http: HttpClient) {}
  async search(
    indexId: string,
    input: {
      vector: number[];
      top_k?: number;
      filter?: Record<string, unknown>;
    }
  ): Promise<{ results: VectorSearchResult[] }> {
    return this.http.post(`/v1/vectors/indexes/${indexId}/search`, input);
  }
  async hybridSearch(
    indexId: string,
    input: { vector: number[]; text?: string; top_k?: number }
  ): Promise<{ results: VectorSearchResult[] }> {
    return this.http.post(
      `/v1/vectors/indexes/${indexId}/hybrid-search`,
      input
    );
  }
}
