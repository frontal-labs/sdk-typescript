import { z } from "zod";

export const connectorSlugSchema = z.enum([
  "file",
  "s3",
  "gcs",
  "azure-blob",
  "postgres",
  "mysql",
  "mongodb",
  "snowflake",
  "web",
  "api",
  "feed",
  "kafka",
  "elasticsearch",
  "github",
  "email",
  "redshift",
  "bigquery",
  "salesforce",
  "google-sheets",
  "airtable",
  "notion",
]);

export const connectorAuthModeSchema = z.enum([
  "none",
  "access_key",
  "connection_string",
  "service_account",
  "api_key",
  "bearer",
  "basic",
]);

export const connectorInstallationStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "error",
]);

export const syncRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const syncTriggerSchema = z.enum(["manual", "scheduled"]);

export const syncModeSchema = z.enum(["full", "incremental"]);

export const connectionTestStatusSchema = z.enum(["succeeded", "failed"]);

export const syncJobStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
]);

export const connectorDefinitionSchema = z
  .object({
    slug: connectorSlugSchema,
    version: z.string(),
    displayName: z.string(),
    description: z.string(),
    authModes: z.array(connectorAuthModeSchema),
    supportsIncremental: z.boolean(),
    supportsWebhook: z.boolean(),
    configSchema: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const connectorInstallationSchema = z
  .object({
    id: z.string(),
    connectorSlug: connectorSlugSchema,
    tenantId: z.string(),
    environmentId: z.string().optional(),
    datasetNamespace: z.string(),
    displayName: z.string(),
    status: connectorInstallationStatusSchema,
    config: z.record(z.string(), z.unknown()),
    auth: z.object({
      mode: connectorAuthModeSchema,
      secretRef: z.string().optional(),
      lastValidatedAt: z.string().optional(),
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const connectorCheckpointSchema = z
  .object({
    installationId: z.string(),
    value: z.record(z.string(), z.unknown()),
    updatedAt: z.string(),
  })
  .passthrough();

export const syncRunSchema = z
  .object({
    id: z.string(),
    installationId: z.string(),
    trigger: syncTriggerSchema,
    mode: syncModeSchema,
    status: syncRunStatusSchema,
    stats: z
      .object({
        recordsRead: z.number().int(),
        recordsWritten: z.number().int(),
        replayOf: z.string().optional(),
      })
      .optional(),
    checkpointBefore: z.record(z.string(), z.unknown()).optional(),
    checkpointAfter: z.record(z.string(), z.unknown()).optional(),
    startedAt: z.string(),
    finishedAt: z.string().optional(),
  })
  .passthrough();

export const connectionTestSchema = z
  .object({
    id: z.string(),
    installationId: z.string(),
    actorId: z.string().optional(),
    status: connectionTestStatusSchema,
    message: z.string(),
    startedAt: z.string(),
    finishedAt: z.string(),
  })
  .passthrough();

export const syncJobQueueSchema = z
  .object({
    id: z.string(),
    syncRunId: z.string(),
    installationId: z.string(),
    connectorSlug: connectorSlugSchema,
    tenantId: z.string(),
    environmentId: z.string().optional(),
    config: z.record(z.string(), z.unknown()),
    auth: z.record(z.string(), z.unknown()),
    checkpoint: z.record(z.string(), z.unknown()).optional(),
    syncMode: syncModeSchema,
    status: syncJobStatusSchema,
    attemptCount: z.number().int(),
    availableAt: z.string(),
    leaseId: z.string().optional(),
    leaseExpiresAt: z.string().optional(),
    lastError: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const createInstallationInputSchema = z.object({
  connectorSlug: connectorSlugSchema,
  tenantId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  datasetNamespace: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  auth: z
    .object({
      mode: connectorAuthModeSchema,
      secretRef: z.string().trim().min(1).optional(),
    })
    .optional(),
});

export const updateInstallationInputSchema = z
  .object({
    displayName: z.string().trim().min(1).optional(),
    datasetNamespace: z.string().trim().min(1).optional(),
    status: connectorInstallationStatusSchema.optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    auth: z
      .object({
        mode: connectorAuthModeSchema.optional(),
        secretRef: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .refine((value: Record<string, unknown>) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const listInstallationsQuerySchema = z.object({
  tenantId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  connectorSlug: connectorSlugSchema.optional(),
});

export const createSyncRunInputSchema = z.object({
  trigger: syncTriggerSchema.optional(),
  mode: syncModeSchema.optional(),
});

export const replaySyncRunInputSchema = z.object({
  mode: syncModeSchema.optional(),
});

export const createConnectionTestInputSchema = z.object({
  actorId: z.string().trim().min(1).optional(),
});

export type ConnectorSlug = z.infer<typeof connectorSlugSchema>;
export type ConnectorAuthMode = z.infer<typeof connectorAuthModeSchema>;
export type ConnectorInstallationStatus = z.infer<
  typeof connectorInstallationStatusSchema
>;
export type SyncRunStatus = z.infer<typeof syncRunStatusSchema>;
export type SyncTrigger = z.infer<typeof syncTriggerSchema>;
export type SyncMode = z.infer<typeof syncModeSchema>;
export type ConnectionTestStatus = z.infer<typeof connectionTestStatusSchema>;
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>;
export type ConnectorDefinition = z.infer<typeof connectorDefinitionSchema>;
export type ConnectorInstallation = z.infer<typeof connectorInstallationSchema>;
export type ConnectorCheckpoint = z.infer<typeof connectorCheckpointSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
export type ConnectionTest = z.infer<typeof connectionTestSchema>;
export type SyncJobQueue = z.infer<typeof syncJobQueueSchema>;
export type CreateInstallationInput = z.infer<
  typeof createInstallationInputSchema
>;
export type UpdateInstallationInput = z.infer<
  typeof updateInstallationInputSchema
>;
export type ListInstallationsQuery = z.infer<
  typeof listInstallationsQuerySchema
>;
export type CreateSyncRunInput = z.infer<typeof createSyncRunInputSchema>;
export type ReplaySyncRunInput = z.infer<typeof replaySyncRunInputSchema>;
export type CreateConnectionTestInput = z.infer<
  typeof createConnectionTestInputSchema
>;
