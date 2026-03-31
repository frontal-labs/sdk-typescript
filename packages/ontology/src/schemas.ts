import {
	filterConditionsSchema,
	retryConfigSchema,
	timestampSchema,
} from "@frontal/core";
import { z } from "zod";

export const FieldTypeSchema = z.enum([
	"string",
	"integer",
	"float",
	"boolean",
	"uuid",
	"timestamp",
	"currency",
	"json",
	"array",
	"enum",
	"vector",
	"text",
]);

export const RelationshipTypeSchema = z.enum([
	"hasOne",
	"hasMany",
	"belongsTo",
	"manyToMany",
]);

export const FieldDefinitionSchema = z
	.object({
		type: FieldTypeSchema,
		required: z.boolean().default(false),
		primary: z.boolean().default(false),
		unique: z.boolean().default(false),
		default: z.unknown().optional(),
		substrate: z.string().optional(),
		computed: z.boolean().optional(),
		derivedBy: z.string().optional(),
		cache: z
			.object({
				ttl: z.string(),
			})
			.optional(),
		auto: z.boolean().optional(),
		enum: z.array(z.string()).optional(),
		dimensions: z.number().int().optional(),
		items: z.string().optional(),
		description: z.string().optional(),
	})
	.passthrough();

export const RelationshipDefinitionSchema = z
	.object({
		name: z.string().optional(),
		type: RelationshipTypeSchema,
		targetEntity: z.string(),
		foreignKey: z.string().optional(),
		substrate: z.string().optional(),
		cascade: z
			.object({
				delete: z.enum(["hard", "soft", "restrict", "nullify"]),
				update: z.enum(["cascade", "restrict"]),
			})
			.optional(),
		computed: z.record(z.string(), z.unknown()).optional(),
		description: z.string().optional(),
	})
	.passthrough();

export const SubstrateRoutingSchema = z
	.object({
		operational: z.string().optional(),
		analytical: z.string().optional(),
		semantic: z.string().optional(),
		cache: z.string().optional(),
	})
	.passthrough();

export const SemanticMetadataSchema = z
	.object({
		description: z.string().optional(),
		lifecycle: z.array(z.string()).optional(),
		criticalFields: z.array(z.string()).optional(),
		significantEvents: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	})
	.passthrough();

export const IndexDefinitionSchema = z
	.object({
		name: z.string().optional(),
		fields: z.array(z.string()).min(1),
		substrate: z.string().optional(),
		unique: z.boolean().default(false),
		type: z.enum(["btree", "hash", "gin", "gist", "brin"]).default("btree"),
	})
	.passthrough();

export const ModelDefinitionSchema = z
	.object({
		name: z.string(),
		displayName: z.string().optional(),
		description: z.string().optional(),
		extends: z.string().optional(),
		mixins: z.array(z.string()).optional(),
		fields: z.record(z.string(), FieldDefinitionSchema),
		relationships: z
			.record(z.string(), RelationshipDefinitionSchema)
			.optional(),
		substrates: SubstrateRoutingSchema.optional(),
		semantics: SemanticMetadataSchema.optional(),
		indexes: z.array(IndexDefinitionSchema).optional(),
		status: z.enum(["draft", "active", "deprecated"]).default("draft"),
	})
	.strict();

export const ModelSchema = ModelDefinitionSchema.extend({
	id: z.string(),
	version: z.number().int(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	entityCount: z.number().int().optional(),
}).passthrough();

export const MigrationPlanSchema = z
	.object({
		id: z.string(),
		modelId: z.string(),
		fromVersion: z.number().int(),
		toVersion: z.number().int(),
		changes: z.array(
			z.object({
				type: z.enum([
					"add-field",
					"remove-field",
					"modify-field",
					"add-relationship",
					"remove-relationship",
				]),
				description: z.string(),
				impact: z.enum(["breaking", "non-breaking", "data-loss"]),
				sql: z.string().optional(),
			}),
		),
		riskLevel: z.enum(["low", "medium", "high", "critical"]),
		estimatedDowntime: z.string().optional(),
		rolloutStrategy: z.enum([
			"zero-downtime",
			"maintenance-window",
			"immediate",
		]),
		createdAt: timestampSchema,
	})
	.passthrough();

export const RuleDefinitionSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		entityTypes: z.array(z.string()).min(1),
		condition: z.string(),
		action: z.enum(["validate", "transform", "notify"]),
		severity: z.enum(["error", "warning", "info"]),
		enabled: z.boolean().default(true),
	})
	.strict();

export const MixinDefinitionSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		fields: z.record(z.string(), FieldDefinitionSchema),
		relationships: z
			.record(z.string(), RelationshipDefinitionSchema)
			.optional(),
		appliesTo: z.array(z.string()).optional(),
	})
	.strict();

// Inferred types
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type RelationshipDefinition = z.infer<
	typeof RelationshipDefinitionSchema
>;
export type SubstrateRouting = z.infer<typeof SubstrateRoutingSchema>;
export type SemanticMetadata = z.infer<typeof SemanticMetadataSchema>;
export type IndexDefinition = z.infer<typeof IndexDefinitionSchema>;
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
export type MixinDefinition = z.infer<typeof MixinDefinitionSchema>;
