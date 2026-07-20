import { timestampSchema } from "@frontal-labs/_core";
import { z } from "zod";

/**
 * Schema for field data types.
 */
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

/**
 * Schema for relationship cardinality types.
 */
export const RelationshipTypeSchema = z.enum([
  "hasOne",
  "hasMany",
  "belongsTo",
  "manyToMany",
]);

/**
 * Schema for defining a field within a model.
 */
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
  .loose();

/**
 * Schema for defining a relationship between models.
 */
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
  .loose();

/**
 * Schema for substrate routing configuration (operational/analytical/semantic/cache).
 */
export const SubstrateRoutingSchema = z
  .object({
    operational: z.string().optional(),
    analytical: z.string().optional(),
    semantic: z.string().optional(),
    cache: z.string().optional(),
  })
  .loose();

/**
 * Schema for semantic metadata (description, lifecycle, tags).
 */
export const SemanticMetadataSchema = z
  .object({
    description: z.string().optional(),
    lifecycle: z.array(z.string()).optional(),
    criticalFields: z.array(z.string()).optional(),
    significantEvents: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .loose();

/**
 * Schema for defining a database index on a model.
 */
export const IndexDefinitionSchema = z
  .object({
    name: z.string().optional(),
    fields: z.array(z.string()).min(1),
    substrate: z.string().optional(),
    unique: z.boolean().default(false),
    type: z.enum(["btree", "hash", "gin", "gist", "brin"]).default("btree"),
  })
  .loose();

/**
 * Schema for defining a new model (fields, relationships, substrates, indexes).
 */
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

/**
 * Schema for a full model resource including runtime state.
 */
export const ModelSchema = ModelDefinitionSchema.extend({
  id: z.string(),
  version: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  entityCount: z.number().int().optional(),
}).loose();

/**
 * Schema for a migration plan between model versions.
 */
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
      })
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
  .loose();

/**
 * Schema for a validation or transformation rule.
 */
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

/**
 * Schema for a reusable mixin (shared set of fields and relationships).
 */
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

/** Field data type. */
export type FieldType = z.infer<typeof FieldTypeSchema>;
/** Relationship cardinality type. */
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
/** Field definition type. */
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
/** Relationship definition type. */
export type RelationshipDefinition = z.infer<
  typeof RelationshipDefinitionSchema
>;
/** Substrate routing configuration type. */
export type SubstrateRouting = z.infer<typeof SubstrateRoutingSchema>;
/** Semantic metadata type. */
export type SemanticMetadata = z.infer<typeof SemanticMetadataSchema>;
/** Index definition type. */
export type IndexDefinition = z.infer<typeof IndexDefinitionSchema>;
/** Model definition (input) type. */
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
/** Full model resource type. */
export type Model = z.infer<typeof ModelSchema>;
/** Migration plan type. */
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;
/** Validation/transformation rule definition type. */
export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
/** Reusable mixin definition type. */
export type MixinDefinition = z.infer<typeof MixinDefinitionSchema>;
