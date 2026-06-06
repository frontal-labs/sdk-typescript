import type { VectorsService } from "./service";
import type { VectorIndex, VectorSearchResult } from "./schemas";

interface EmbedClient {
  embed(opts: {
    model: string;
    input: string | string[];
  }): Promise<{ embeddings: number[][]; usage: { totalTokens: number } }>;
}

export async function embedAndUpsert(
  ai: EmbedClient,
  vectors: VectorsService,
  indexId: string,
  texts: string[],
  model: string,
  metadataFn?: (text: string, index: number) => Record<string, unknown>
): Promise<{ embedded: number; upserted: number }> {
  const result = await ai.embed({ model, input: texts });
  const vectors_: {
    id: string;
    values: number[];
    metadata?: Record<string, unknown>;
  }[] = result.embeddings.map((values, i) => ({
    id: `vec_${Date.now()}_${i}`,
    values,
    metadata: metadataFn ? metadataFn(texts[i], i) : { text: texts[i] },
  }));

  const upserted = await vectors.upsert(indexId, vectors_);
  return { embedded: result.embeddings.length, upserted: upserted.inserted };
}

export async function embedAndSearch(
  ai: EmbedClient,
  vectors: VectorsService,
  indexId: string,
  query: string,
  model: string,
  topK: number = 5
): Promise<VectorSearchResult[]> {
  const result = await ai.embed({ model, input: query });
  const queryVector = result.embeddings[0];
  if (!queryVector) throw new Error("Embedding returned empty result");

  const searchResult = await vectors.search.search(indexId, {
    vector: queryVector,
    topK,
  });
  return searchResult.results;
}

export async function createIndexFromModel(
  vectors: VectorsService,
  name: string,
  modelDimensions: number,
  metric: string = "cosine"
): Promise<VectorIndex> {
  return vectors.indexes.create({
    name,
    dimensions: modelDimensions,
    metric,
  });
}
