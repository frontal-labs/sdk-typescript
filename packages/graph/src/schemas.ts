import { filterConditionsSchema, timestampSchema } from "@frontal-labs/_core";
import { z } from "zod";

/**
 * Schema for entity metadata (id, type, version, timestamps).
 */
export const EntityMetaSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    version: z.number().int(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    createdBy: z.string().optional(),
  })
  .loose();

/**
 * Schema for a linked entity reference (id, type, relation).
 */
export const LinkedEntitySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    relation: z.string(),
  })
  .loose();

/**
 * Schema for a full entity with data, meta, linked entities, and timestamps.
 */
export const EntitySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    version: z.number().int(),
    data: z.record(z.string(), z.unknown()),
    meta: EntityMetaSchema.optional(),
    linkedEntities: z.array(LinkedEntitySchema).optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .loose();

/**
 * Schema for a relationship edge between two entities.
 */
export const EdgeSchema = z
  .object({
    id: z.string(),
    fromEntity: z.object({ id: z.string(), type: z.string() }),
    toEntity: z.object({ id: z.string(), type: z.string() }),
    relationType: z.string(),
    weight: z.number().optional(),
    createdAt: timestampSchema,
  })
  .loose();

/**
 * Schema for querying entities in the graph with conditions, ordering, and pagination.
 */
export const GraphQuerySchema = z
  .object({
    entityType: z.string(),
    conditions: filterConditionsSchema.optional(),
    include: z.array(z.string()).optional(),
    orderBy: z
      .array(
        z.object({ field: z.string(), direction: z.enum(["asc", "desc"]) })
      )
      .optional(),
    limit: z.number().int().positive().optional(),
    cursor: z.string().optional(),
    at: z.iso.datetime().optional(),
  })
  .loose();

/**
 * Schema for entity version history with change tracking.
 */
export const EntityHistorySchema = z
  .object({
    entityId: z.string(),
    entityType: z.string(),
    history: z.array(
      z.object({
        version: z.number().int(),
        changes: z.array(
          z.object({ field: z.string(), from: z.unknown(), to: z.unknown() })
        ),
        changedBy: z.string(),
        changedAt: timestampSchema,
        reason: z.string().optional(),
      })
    ),
  })
  .loose();

/**
 * Schema for graph traversal requests (start entity, direction, depth).
 */
export const TraversalRequestSchema = z
  .object({
    startEntity: z.object({ id: z.string(), type: z.string() }),
    direction: z.enum(["outgoing", "incoming", "both"]).default("outgoing"),
    maxDepth: z.number().int().positive().default(5),
    filters: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/**
 * Schema for finding paths between two entities in the graph.
 */
export const PathRequestSchema = z
  .object({
    fromEntity: z.object({ id: z.string(), type: z.string() }),
    toEntity: z.object({ id: z.string(), type: z.string() }),
    maxPaths: z.number().int().positive().default(10),
    algorithm: z.enum(["shortest", "all", "weighted"]).default("shortest"),
  })
  .loose();

/**
 * Schema for semantic search options (query, entity type, filters, threshold).
 */
export const SemanticSearchOptionsSchema = z
  .object({
    query: z.string(),
    entityType: z.string().optional(),
    filters: filterConditionsSchema.optional(),
    limit: z.number().int().positive().default(10),
    threshold: z.number().min(0).max(1).default(0.7),
  })
  .loose();

/**
 * Schema for the result of a batch operation (total/successful/failed counts).
 */
export const BatchResultSchema = z
  .object({
    total: z.number().int(),
    successful: z.number().int(),
    failed: z.number().int(),
    errors: z.array(
      z.object({
        index: z.number().int(),
        entity: z.record(z.string(), z.unknown()),
        error: z.string(),
      })
    ),
  })
  .loose();

/** Entity metadata type. */
export type EntityMeta = z.infer<typeof EntityMetaSchema>;
/** Linked entity reference type. */
export type LinkedEntity = z.infer<typeof LinkedEntitySchema>;
/** Full entity type. */
export type Entity = z.infer<typeof EntitySchema>;
/** Relationship edge type. */
export type Edge = z.infer<typeof EdgeSchema>;
/** Graph query type. */
export type GraphQuery = z.infer<typeof GraphQuerySchema>;
/** Entity version history type. */
export type EntityHistory = z.infer<typeof EntityHistorySchema>;
/** Graph traversal request type. */
export type TraversalRequest = z.infer<typeof TraversalRequestSchema>;
/** Path finding request type. */
export type PathRequest = z.infer<typeof PathRequestSchema>;
/** Semantic search options type. */
export type SemanticSearchOptions = z.infer<typeof SemanticSearchOptionsSchema>;
/** Batch operation result type. */
export type BatchResult = z.infer<typeof BatchResultSchema>;
