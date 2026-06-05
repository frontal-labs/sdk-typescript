import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { SearchResult, UnifiedSearchResponse } from "./schemas";

// SearchService delegates to backend unified search endpoint, which
// orchestrates vector + semantic + structured search internally.
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  async search(input: {
    query: string;
    modes?: Array<"vector" | "semantic" | "structured">;
    top_k?: number;
    filters?: {
      index_ids?: string[];
      entity_types?: string[];
      dataset_ids?: string[];
    };
  }): Promise<UnifiedSearchResponse> {
    return this.http.post("/v1/search", input);
  }

  async vectorSearch(input: {
    index_id: string;
    vector?: number[];
    text?: string;
    top_k?: number;
    filter?: Record<string, unknown>;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/vector", input);
  }

  async semanticSearch(input: {
    query: string;
    entity_types?: string[];
    limit?: number;
    at?: string;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/semantic", input);
  }

  async structuredSearch(input: {
    dataset_id: string;
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/structured", input);
  }

  async hybridSearch(input: {
    query: string;
    index_id?: string;
    entity_types?: string[];
    top_k?: number;
  }): Promise<UnifiedSearchResponse> {
    return this.http.post("/v1/search/hybrid", input);
  }

  async listIndexedSources(): Promise<{
    indexes: Array<{ id: string; name: string; type: string }>;
    entity_types: Array<{ name: string; count: number }>;
    datasets: Array<{ id: string; name: string }>;
  }> {
    return this.http.get("/v1/search/sources");
  }
}

export class SearchStatsNamespace {
  constructor(private readonly http: HttpClient) {}

  async getPopularQueries(
    opts: { from?: string; to?: string; limit?: number } = {}
  ): Promise<{ queries: Array<{ query: string; count: number }> }> {
    return this.http.get("/v1/search/stats/popular", opts);
  }

  async getIndexingStatus(): Promise<{
    indexes: Array<{ id: string; status: string; vector_count: number }>;
  }> {
    return this.http.get("/v1/search/stats/indexing");
  }
}
