import { z } from "zod";

export const LineageNodeSchema = z
  .object({
    id: z.string(),
    type: z.enum(["dataset", "pipeline", "model", "table"]),
    name: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .passthrough();
export const LineageEdgeSchema = z
  .object({
    id: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    type: z.enum(["derived_from", "consumes", "produces", "depends_on"]),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.string(),
  })
  .passthrough();
export const LineageGraphSchema = z
  .object({
    nodes: z.array(LineageNodeSchema),
    edges: z.array(LineageEdgeSchema),
  })
  .passthrough();
export const lineageConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type LineageNode = z.infer<typeof LineageNodeSchema>;
export type LineageEdge = z.infer<typeof LineageEdgeSchema>;
export type LineageGraph = z.infer<typeof LineageGraphSchema>;
export type LineageConfig = z.input<typeof lineageConfigSchema>;
