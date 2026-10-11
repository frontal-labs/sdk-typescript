import { z } from "zod";

/**
 * Capability Budget (matches internal CapabilityBudget)
 */
export const CapabilityBudgetSchema = z.object({
  timeout: z.string().optional(), // "5s", "30s"
  maxTokens: z.number().int().nonnegative().optional(),
  maxCostUsd: z.number().nonnegative().optional(),
});
export type CapabilityBudget = z.infer<typeof CapabilityBudgetSchema>;
export type CapabilityBudgetInput = z.input<typeof CapabilityBudgetSchema>;

/**
 * KV Capability (matches internal WorkerCapability.kv)
 */
export const KvCapabilitySchema = z.object({
  kv: z.object({
    namespace: z.string().min(1),
    keyPrefix: z.string().default(""),
    operations: z
      .array(
        z.enum(["GET", "PUT", "DELETE", "LIST", "CAS", "TTL", "INCREMENT"])
      )
      .min(1),
  }),
});
export type KvCapability = z.infer<typeof KvCapabilitySchema>;
export type KvCapabilityInput = z.input<typeof KvCapabilitySchema>;

/**
 * Blob Capability (matches internal WorkerCapability.blob)
 */
export const BlobCapabilitySchema = z.object({
  blob: z.object({
    bucket: z.string().min(1),
    objectPrefix: z.string().default(""),
    operations: z
      .array(z.enum(["GET", "PUT", "HEAD", "DELETE", "LIST"]))
      .min(1),
  }),
});
export type BlobCapability = z.infer<typeof BlobCapabilitySchema>;
export type BlobCapabilityInput = z.input<typeof BlobCapabilitySchema>;

/**
 * AI Capability (matches internal WorkerCapability.ai)
 */
export const AiCapabilitySchema = z.object({
  ai: z.object({
    modelIds: z.array(z.string()).min(1),
    operations: z
      .array(z.enum(["CHAT", "EMBEDDINGS", "RERANK", "LIST_MODELS"]))
      .min(1),
  }),
});
export type AiCapability = z.infer<typeof AiCapabilitySchema>;
export type AiCapabilityInput = z.input<typeof AiCapabilitySchema>;

/**
 * Telemetry Capability (matches internal WorkerCapability.telemetry)
 */
export const TelemetryCapabilitySchema = z.object({
  telemetry: z.object({
    operations: z.array(z.enum(["EMIT"])).min(1),
  }),
});
export type TelemetryCapability = z.infer<typeof TelemetryCapabilitySchema>;
export type TelemetryCapabilityInput = z.input<
  typeof TelemetryCapabilitySchema
>;

/**
 * Ontology Capability (matches internal WorkerCapability.ontology)
 */
export const OntologyCapabilitySchema = z.object({
  ontology: z.object({
    resourceIds: z.array(z.string()).min(1),
    operations: z
      .array(z.enum(["READ", "SEARCH", "QUERY_GRAPH", "VALIDATE"]))
      .min(1),
  }),
});
export type OntologyCapability = z.infer<typeof OntologyCapabilitySchema>;
export type OntologyCapabilityInput = z.input<typeof OntologyCapabilitySchema>;

/**
 * Data Capability (matches internal WorkerCapability.data)
 */
export const DataCapabilitySchema = z.object({
  data: z.object({
    surface: z.enum([
      "CATALOG",
      "INGESTION",
      "TRANSFORMATION",
      "ANALYSIS",
      "QUERY",
    ]),
    resourceIds: z.array(z.string()).min(1),
    operations: z.array(z.enum(["READ", "QUERY", "DISCOVER"])).min(1),
  }),
});
export type DataCapability = z.infer<typeof DataCapabilitySchema>;
export type DataCapabilityInput = z.input<typeof DataCapabilitySchema>;

/**
 * Union of all capability kinds (matches internal WorkerCapability oneof)
 */
export const CapabilityKindSchema = z.union([
  KvCapabilitySchema,
  BlobCapabilitySchema,
  AiCapabilitySchema,
  TelemetryCapabilitySchema,
  OntologyCapabilitySchema,
  DataCapabilitySchema,
]);
export type CapabilityKind = z.infer<typeof CapabilityKindSchema>;
export type CapabilityKindInput = z.input<typeof CapabilityKindSchema>;

/**
 * Full Capability (matches internal Capability)
 */
export const CapabilitySchema = z.object({
  name: z.string().min(1), // runtime key: env.CAPABILITIES.kv("cache")
  kind: CapabilityKindSchema,
  budget: CapabilityBudgetSchema.optional(),
});
export type Capability = z.infer<typeof CapabilitySchema>;
export type CapabilityInput = z.input<typeof CapabilitySchema>;

/**
 * Fluent Builders (Vercel DX, exact wire format)
 */

// Operation group mappings
const KV_OP_MAP = {
  read: ["GET", "LIST"] as const,
  write: ["PUT", "DELETE", "CAS"] as const,
  admin: ["TTL", "INCREMENT"] as const,
};

const BLOB_OP_MAP = {
  read: ["GET", "HEAD", "LIST"] as const,
  write: ["PUT", "DELETE"] as const,
};

const AI_OP_MAP = {
  chat: ["CHAT"] as const,
  embeddings: ["EMBEDDINGS"] as const,
  rerank: ["RERANK"] as const,
};

const ONTOLOGY_OP_MAP = {
  read: ["READ"] as const,
  search: ["SEARCH"] as const,
  query: ["QUERY_GRAPH"] as const,
  validate: ["VALIDATE"] as const,
};

const DATA_OP_MAP = {
  read: ["READ"] as const,
  query: ["QUERY"] as const,
  discover: ["DISCOVER"] as const,
};

/**
 * Creates a KV capability.
 */
export function kv(config: {
  namespace: string;
  keyPrefix?: string;
  operations?: ("read" | "write" | "admin")[];
  budget?: CapabilityBudgetInput;
}): Capability {
  const opMap = KV_OP_MAP;
  const operations = (config.operations ?? ["read", "write"]).flatMap(
    (o) => opMap[o]
  );
  return {
    name: "kv",
    kind: {
      kv: {
        namespace: config.namespace,
        keyPrefix: config.keyPrefix ?? "",
        operations,
      },
    },
    budget: config.budget,
  };
}

/**
 * Creates a Blob capability.
 */
export function blob(config: {
  bucket: string;
  objectPrefix?: string;
  operations?: ("read" | "write")[];
  budget?: CapabilityBudgetInput;
}): Capability {
  const opMap = BLOB_OP_MAP;
  const operations = (config.operations ?? ["read", "write"]).flatMap(
    (o) => opMap[o]
  );
  return {
    name: "blob",
    kind: {
      blob: {
        bucket: config.bucket,
        objectPrefix: config.objectPrefix ?? "",
        operations,
      },
    },
    budget: config.budget,
  };
}

/**
 * Creates an AI capability.
 */
export function ai(config: {
  modelIds: string | string[];
  operations?: ("chat" | "embeddings" | "rerank")[];
  budget?: CapabilityBudgetInput;
}): Capability {
  const opMap = AI_OP_MAP;
  const operations = (config.operations ?? ["chat"]).flatMap((o) => opMap[o]);
  return {
    name: "ai",
    kind: {
      ai: {
        modelIds: Array.isArray(config.modelIds)
          ? config.modelIds
          : [config.modelIds],
        operations,
      },
    },
    budget: config.budget,
  };
}

/**
 * Creates an Ontology capability.
 */
export function ontology(config: {
  resourceIds: string | string[];
  operations?: ("read" | "search" | "query" | "validate")[];
  budget?: CapabilityBudgetInput;
}): Capability {
  const opMap = ONTOLOGY_OP_MAP;
  const operations = (config.operations ?? ["read", "search"]).flatMap(
    (o) => opMap[o]
  );
  return {
    name: "ontology",
    kind: {
      ontology: {
        resourceIds: Array.isArray(config.resourceIds)
          ? config.resourceIds
          : [config.resourceIds],
        operations,
      },
    },
    budget: config.budget,
  };
}

/**
 * Creates a Data capability.
 */
export function data(config: {
  surface: "catalog" | "ingestion" | "transformation" | "analysis" | "query";
  resourceIds: string | string[];
  operations?: ("read" | "query" | "discover")[];
  budget?: CapabilityBudgetInput;
}): Capability {
  const opMap = DATA_OP_MAP;
  const operations = (config.operations ?? ["read", "query"]).flatMap(
    (o) => opMap[o]
  );
  return {
    name: "data",
    kind: {
      data: {
        surface: config.surface.toUpperCase() as
          | "CATALOG"
          | "INGESTION"
          | "TRANSFORMATION"
          | "ANALYSIS"
          | "QUERY",
        resourceIds: Array.isArray(config.resourceIds)
          ? config.resourceIds
          : [config.resourceIds],
        operations,
      },
    },
    budget: config.budget,
  };
}

/**
 * Creates a Telemetry capability.
 */
export function telemetry(
  config: { budget?: CapabilityBudgetInput } = {}
): Capability {
  return {
    name: "telemetry",
    kind: { telemetry: { operations: ["EMIT"] } },
    budget: config.budget,
  };
}
