import type { HttpClient } from "@frontal-labs/core";
import type { SearchResult, UnifiedSearchResponse } from "./schemas";

// SearchService delegates to backend unified search endpoint, which
// orchestrates vector + semantic + structured search internally.
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  async search(input: {
    query: string;
    modes?: ("vector" | "semantic" | "structured")[];
    topK?: number;
    filters?: {
      indexIds?: string[];
      entityTypes?: string[];
      datasetIds?: string[];
    };
  }): Promise<UnifiedSearchResponse> {
    return this.http.post("/v1/search", input);
  }

  async vectorSearch(input: {
    indexId: string;
    vector?: number[];
    text?: string;
    topK?: number;
    filter?: Record<string, unknown>;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/vector", input);
  }

  async semanticSearch(input: {
    query: string;
    entityTypes?: string[];
    limit?: number;
    at?: string;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/semantic", input);
  }

  async structuredSearch(input: {
    datasetId: string;
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<{ results: SearchResult[]; total: number }> {
    return this.http.post("/v1/search/structured", input);
  }

  async hybridSearch(input: {
    query: string;
    indexId?: string;
    entityTypes?: string[];
    topK?: number;
  }): Promise<UnifiedSearchResponse> {
    return this.http.post("/v1/search/hybrid", input);
  }

  async listIndexedSources(): Promise<{
    indexes: { id: string; name: string; type: string }[];
    entityTypes: { name: string; count: number }[];
    datasets: { id: string; name: string }[];
  }> {
    return this.http.get("/v1/search/sources");
  }
}

export class StatsNamespace {
  constructor(private readonly http: HttpClient) {}

  async getPopularQueries(
    opts: { from?: string; to?: string; limit?: number } = {}
  ): Promise<{ queries: { query: string; count: number }[] }> {
    return this.http.get("/v1/search/stats/popular", opts);
  }

  async getIndexingStatus(): Promise<{
    indexes: { id: string; status: string; vectorCount: number }[];
  }> {
    return this.http.get("/v1/search/stats/indexing");
  }
}
