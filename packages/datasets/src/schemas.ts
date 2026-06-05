import { z } from "zod";

export const DatasetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    schema: z.record(z.string(), z.unknown()).optional(),
    row_count: z.number().int(),
    storage_size_bytes: z.number().int(),
    version_count: z.number().int(),
    status: z.enum(["active", "archived"]),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();
export const DatasetVersionSchema = z
  .object({
    id: z.string(),
    dataset_id: z.string(),
    version: z.number().int(),
    schema: z.record(z.string(), z.unknown()),
    row_count: z.number().int(),
    created_at: z.string(),
  })
  .passthrough();
export const DatasetStatsSchema = z
  .object({
    row_count: z.number().int(),
    storage_size_bytes: z.number().int(),
    column_count: z.number().int(),
    last_updated: z.string(),
  })
  .passthrough();
export const datasetsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetVersion = z.infer<typeof DatasetVersionSchema>;
export type DatasetStats = z.infer<typeof DatasetStatsSchema>;
export type DatasetsConfig = z.input<typeof datasetsConfigSchema>;
