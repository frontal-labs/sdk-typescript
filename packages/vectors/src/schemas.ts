import { z } from "zod";

export const VectorIndexSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    dimensions: z.number().int(),
    metric: z.enum(["cosine", "euclidean", "dot_product"]),
    vector_count: z.number().int(),
    status: z.enum(["active", "building", "deleted"]),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const VectorSchema = z
  .object({
    id: z.string(),
    index_id: z.string(),
    values: z.array(z.number()),
    metadata: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string(),
  })
  .passthrough();
export const VectorSearchResultSchema = z
  .object({
    id: z.string(),
    score: z.number(),
    vector_id: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export const vectorsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type VectorIndex = z.infer<typeof VectorIndexSchema>;
export type Vector = z.infer<typeof VectorSchema>;
export type VectorSearchResult = z.infer<typeof VectorSearchResultSchema>;
export type VectorsConfig = z.input<typeof vectorsConfigSchema>;
