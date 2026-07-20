import { z } from "zod";

/** Zod schema for a dataset. */
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
  .loose();
/** Zod schema for a dataset version. */
export const DatasetVersionSchema = z
  .object({
    id: z.string(),
    datasetId: z.string(),
    version: z.number().int(),
    schema: z.record(z.string(), z.unknown()),
    rowCount: z.number().int(),
    createdAt: z.string(),
  })
  .loose();
/** Zod schema for dataset statistics. */
export const DatasetStatsSchema = z
  .object({
    rowCount: z.number().int(),
    storageSizeBytes: z.number().int(),
    columnCount: z.number().int(),
    lastUpdated: z.string(),
  })
  .loose();
/** Zod schema for a dataset schema reference. */
export const DatasetSchemaRefSchema = z
  .object({
    schemaRef: z.string(),
    name: z.string().optional(),
    version: z.union([z.string(), z.number()]).optional(),
    definition: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();
/** Zod schema for a catalog source. */
export const CatalogSourceSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
  })
  .loose();

/** Zod schema for validating datasets client configuration. */
export const datasetsConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A dataset. */
export type Dataset = z.infer<typeof DatasetSchema>;
/** A version of a dataset. */
export type DatasetVersion = z.infer<typeof DatasetVersionSchema>;
/** Statistics for a dataset. */
export type DatasetStats = z.infer<typeof DatasetStatsSchema>;
/** A reference to a dataset schema. */
export type DatasetSchemaRef = z.infer<typeof DatasetSchemaRefSchema>;
/** A catalog source entry. */
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
/** Validated datasets client configuration. */
export type DatasetsConfig = z.input<typeof datasetsConfigSchema>;
