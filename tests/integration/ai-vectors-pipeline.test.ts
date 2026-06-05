/**
 * Integration: Create vector index → embed text → upsert → search.
 * Verifies the embed-to-vector-search pipeline.
 */
import { describe, expect, it } from "vitest";
import { createIntegrationHarness } from "@frontal-labs/testing";
import { VectorsService } from "@frontal-labs/vectors";
import { AIService } from "@frontal-labs/ai";

const mockIndex = {
  id: "idx_1", name: "docs", dimensions: 8,
  metric: "cosine", vector_count: 0, status: "active",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z",
};

const embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

const mockEmbedResponse = {
  data: [{ object: "embedding", embedding, index: 0 }],
  model: "text-embedding-3-small",
  usage: { prompt_tokens: 4, total_tokens: 4 },
};

describe("AI → Vectors integration pipeline", () => {
  it("embed text → create index → upsert → search", async () => {
    const harness = createIntegrationHarness([
      { method: "POST", path: "/internal/embeddings", body: mockEmbedResponse },
      { method: "POST", path: "/v1/vectors/indexes", body: mockIndex },
      { method: "GET", path: "/v1/vectors/indexes/idx_1", body: mockIndex },
      {
        method: "POST", path: "/v1/vectors/indexes/idx_1/vectors",
        body: { inserted: 1 },
      },
      {
        method: "POST", path: "/v1/vectors/indexes/idx_1/search",
        body: { results: [{ id: "r1", score: 0.92, vector_id: "v1" }] },
      },
    ]);

    const { http: aiHttp } = harness.createHttp();
    const { http: vectorsHttp } = harness.createHttp();

    const ai = new AIService(aiHttp);
    const vectors = new VectorsService(vectorsHttp);

    // Step 1: Embed text
    const embedResult = await ai.embed({
      model: "text-embedding-3-small",
      input: "red shoes",
    });
    expect(embedResult.embeddings.length).toBe(1);

    // Step 2: Create vector index
    const index = await vectors.indexes.create({
      name: "docs",
      dimensions: 8,
    });
    expect(index.dimensions).toBe(8);

    // Step 3: Upsert the embedding
    const upserted = await vectors.vectors.upsert(index.id, [{
      id: "v1",
      values: embedResult.embeddings[0],
      metadata: { text: "red shoes" },
    }]);
    expect(upserted.inserted).toBe(1);

    // Step 4: Search with the same embedding
    const results = await vectors.search.search(index.id, {
      vector: embedResult.embeddings[0],
      top_k: 1,
    });
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].vector_id).toBe("v1");
  });
});
