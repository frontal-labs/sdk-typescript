import { z } from "zod";

/** Schema for a lineage graph node (dataset, pipeline, model, or table). */
export const LineageNodeSchema = z
  .object({
    id: z.string(),
    type: z.enum(["dataset", "pipeline", "model", "table"]),
    name: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .loose();
/** Schema for a lineage graph edge representing a dependency relationship. */
export const LineageEdgeSchema = z
  .object({
    id: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    type: z.enum(["derived_from", "consumes", "produces", "depends_on"]),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .loose();
/** Schema for a complete lineage graph consisting of nodes and edges. */
export const LineageGraphSchema = z
  .object({
    nodes: z.array(LineageNodeSchema),
    edges: z.array(LineageEdgeSchema),
  })
  .loose();
/** Schema for lineage client configuration. */
export const lineageConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

/** A node in a lineage graph. */
export type LineageNode = z.infer<typeof LineageNodeSchema>;
/** An edge in a lineage graph. */
export type LineageEdge = z.infer<typeof LineageEdgeSchema>;
/** A complete lineage graph. */
export type LineageGraph = z.infer<typeof LineageGraphSchema>;
/** Lineage client configuration. */
export type LineageConfig = z.input<typeof lineageConfigSchema>;
