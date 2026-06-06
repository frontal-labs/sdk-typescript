import { z } from "zod";

export const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(["vector", "entity", "dataset_row"]),
  score: z.number(),
  source: z.string(),
  data: z.record(z.string(), z.unknown()),
  highlights: z.record(z.string(), z.array(z.string())).optional(),
});

export const UnifiedSearchRequestSchema = z.object({
  query: z.string(),
  modes: z
    .array(z.enum(["vector", "semantic", "structured"]))
    .default(["vector", "semantic"]),
  topK: z.number().int().positive().default(10),
  filters: z
    .object({
      indexIds: z.array(z.string()).optional(),
      entityTypes: z.array(z.string()).optional(),
      datasetIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export const UnifiedSearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.object({
    vector: z.number(),
    semantic: z.number(),
    structured: z.number(),
  }),
  queryTimeMs: z.number(),
});

export const searchConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type UnifiedSearchRequest = z.infer<typeof UnifiedSearchRequestSchema>;
export type UnifiedSearchResponse = z.infer<typeof UnifiedSearchResponseSchema>;
export type SearchConfig = z.input<typeof searchConfigSchema>;
