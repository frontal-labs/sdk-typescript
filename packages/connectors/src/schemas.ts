import { z } from "zod";

/** Zod schema for supported connector slugs. */
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

/** Zod schema for connector authentication modes. */
export const connectorAuthModeSchema = z.enum([
  "none",
  "access_key",
  "connection_string",
  "service_account",
  "api_key",
  "bearer",
  "basic",
]);

/** Zod schema for connector installation statuses. */
export const connectorInstallationStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "error",
]);

/** Zod schema for sync run statuses. */
export const syncRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);

/** Zod schema for sync trigger types. */
export const syncTriggerSchema = z.enum(["manual", "scheduled"]);

/** Zod schema for sync modes. */
export const syncModeSchema = z.enum(["full", "incremental"]);

/** Zod schema for connection test statuses. */
export const connectionTestStatusSchema = z.enum(["succeeded", "failed"]);

/** Zod schema for sync job statuses. */
export const syncJobStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
]);

/** Zod schema for a connector definition. */
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
  .loose();

/** Zod schema for a connector installation. */
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
  .loose();

/** Zod schema for a connector checkpoint. */
export const connectorCheckpointSchema = z
  .object({
    installationId: z.string(),
    value: z.record(z.string(), z.unknown()),
    updatedAt: z.string(),
  })
  .loose();

/** Zod schema for a sync run. */
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
  .loose();

/** Zod schema for a connection test. */
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
  .loose();

/** Zod schema for a sync job queue entry. */
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
  .loose();

/** Zod schema for creating a connector installation. */
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

/** Zod schema for updating a connector installation. */
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

/** Zod schema for querying installations. */
export const listInstallationsQuerySchema = z.object({
  tenantId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  connectorSlug: connectorSlugSchema.optional(),
});

/** Zod schema for creating a sync run. */
export const createSyncRunInputSchema = z.object({
  trigger: syncTriggerSchema.optional(),
  mode: syncModeSchema.optional(),
});

/** Zod schema for replaying a sync run. */
export const replaySyncRunInputSchema = z.object({
  mode: syncModeSchema.optional(),
});

/** Zod schema for creating a connection test. */
export const createConnectionTestInputSchema = z.object({
  actorId: z.string().trim().min(1).optional(),
});

/** Supported connector slug. */
export type ConnectorSlug = z.infer<typeof connectorSlugSchema>;
/** Connector authentication mode. */
export type ConnectorAuthMode = z.infer<typeof connectorAuthModeSchema>;
/** Install status of a connector. */
export type ConnectorInstallationStatus = z.infer<
  typeof connectorInstallationStatusSchema
>;
/** Status of a sync run. */
export type SyncRunStatus = z.infer<typeof syncRunStatusSchema>;
/** Trigger type for a sync run. */
export type SyncTrigger = z.infer<typeof syncTriggerSchema>;
/** Sync mode (full or incremental). */
export type SyncMode = z.infer<typeof syncModeSchema>;
/** Status of a connection test. */
export type ConnectionTestStatus = z.infer<typeof connectionTestStatusSchema>;
/** Status of a sync job. */
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>;
/** A connector definition from the catalog. */
export type ConnectorDefinition = z.infer<typeof connectorDefinitionSchema>;
/** A connector installation instance. */
export type ConnectorInstallation = z.infer<typeof connectorInstallationSchema>;
/** A connector checkpoint for tracking sync state. */
export type ConnectorCheckpoint = z.infer<typeof connectorCheckpointSchema>;
/** A sync run execution. */
export type SyncRun = z.infer<typeof syncRunSchema>;
/** A connection test result. */
export type ConnectionTest = z.infer<typeof connectionTestSchema>;
/** A sync job queue entry. */
export type SyncJobQueue = z.infer<typeof syncJobQueueSchema>;
/** Input for creating a connector installation. */
export type CreateInstallationInput = z.infer<
  typeof createInstallationInputSchema
>;
/** Input for updating a connector installation. */
export type UpdateInstallationInput = z.infer<
  typeof updateInstallationInputSchema
>;
/** Query parameters for listing installations. */
export type ListInstallationsQuery = z.infer<
  typeof listInstallationsQuerySchema
>;
/** Input for creating a sync run. */
export type CreateSyncRunInput = z.infer<typeof createSyncRunInputSchema>;
/** Input for replaying a sync run. */
export type ReplaySyncRunInput = z.infer<typeof replaySyncRunInputSchema>;
/** Input for creating a connection test. */
export type CreateConnectionTestInput = z.infer<
  typeof createConnectionTestInputSchema
>;
