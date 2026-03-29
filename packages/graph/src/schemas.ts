import { z } from "zod";
import {
	timestampSchema,
	filterConditionsSchema,
	QueryBuilder,
} from "@frontal/core";

export const EntityMetaSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		version: z.number().int(),
		createdAt: timestampSchema,
		updatedAt: timestampSchema,
		createdBy: z.string().optional(),
	})
	.passthrough();

export const LinkedEntitySchema = z
	.object({
		id: z.string(),
		type: z.string(),
		relation: z.string(),
	})
	.passthrough();

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
	.passthrough();

export const EdgeSchema = z
	.object({
		id: z.string(),
		fromEntity: z.object({ id: z.string(), type: z.string() }),
		toEntity: z.object({ id: z.string(), type: z.string() }),
		relationType: z.string(),
		weight: z.number().optional(),
		createdAt: timestampSchema,
	})
	.passthrough();

export const GraphQuerySchema = z
	.object({
		entityType: z.string(),
		conditions: filterConditionsSchema.optional(),
		include: z.array(z.string()).optional(),
		orderBy: z
			.array(
				z.object({ field: z.string(), direction: z.enum(["asc", "desc"]) }),
			)
			.optional(),
		limit: z.number().int().positive().optional(),
		cursor: z.string().optional(),
		at: z.string().datetime().optional(),
	})
	.passthrough();

export const EntityHistorySchema = z
	.object({
		entityId: z.string(),
		entityType: z.string(),
		history: z.array(
			z.object({
				version: z.number().int(),
				changes: z.array(
					z.object({ field: z.string(), from: z.unknown(), to: z.unknown() }),
				),
				changedBy: z.string(),
				changedAt: timestampSchema,
				reason: z.string().optional(),
			}),
		),
	})
	.passthrough();

export const TraversalRequestSchema = z
	.object({
		startEntity: z.object({ id: z.string(), type: z.string() }),
		direction: z.enum(["outgoing", "incoming", "both"]).default("outgoing"),
		maxDepth: z.number().int().positive().default(5),
		filters: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

export const PathRequestSchema = z
	.object({
		fromEntity: z.object({ id: z.string(), type: z.string() }),
		toEntity: z.object({ id: z.string(), type: z.string() }),
		maxPaths: z.number().int().positive().default(10),
		algorithm: z.enum(["shortest", "all", "weighted"]).default("shortest"),
	})
	.passthrough();

export const SemanticSearchOptionsSchema = z
	.object({
		query: z.string(),
		entityType: z.string().optional(),
		filters: filterConditionsSchema.optional(),
		limit: z.number().int().positive().default(10),
		threshold: z.number().min(0).max(1).default(0.7),
	})
	.passthrough();

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
			}),
		),
	})
	.passthrough();

// Inferred types
export type EntityMeta = z.infer<typeof EntityMetaSchema>;
export type LinkedEntity = z.infer<typeof LinkedEntitySchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type GraphQuery = z.infer<typeof GraphQuerySchema>;
export type EntityHistory = z.infer<typeof EntityHistorySchema>;
export type TraversalRequest = z.infer<typeof TraversalRequestSchema>;
export type PathRequest = z.infer<typeof PathRequestSchema>;
export type SemanticSearchOptions = z.infer<typeof SemanticSearchOptionsSchema>;
export type BatchResult = z.infer<typeof BatchResultSchema>;
