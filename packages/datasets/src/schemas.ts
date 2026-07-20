import { z } from "zod";

export const DatasetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    schema: z.record(z.string(), z.unknown()).optional(),
    rowCount: z.number().int(),
    storageSizeBytes: z.number().int(),
    versionCount: z.number().int(),
    status: z.enum(["active", "archived"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export const DatasetVersionSchema = z
  .object({
    id: z.string(),
    datasetId: z.string(),
    version: z.number().int(),
    schema: z.record(z.string(), z.unknown()),
    rowCount: z.number().int(),
    createdAt: z.string(),
  })
  .passthrough();
export const DatasetStatsSchema = z
  .object({
    rowCount: z.number().int(),
    storageSizeBytes: z.number().int(),
    columnCount: z.number().int(),
    lastUpdated: z.string(),
  })
  .passthrough();
export const DatasetSchemaRefSchema = z
  .object({
    schemaRef: z.string(),
    name: z.string().optional(),
    version: z.union([z.string(), z.number()]).optional(),
    definition: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export const CatalogSourceSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
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
export type DatasetSchemaRef = z.infer<typeof DatasetSchemaRefSchema>;
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
export type DatasetsConfig = z.input<typeof datasetsConfigSchema>;
