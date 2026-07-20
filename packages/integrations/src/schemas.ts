import { z } from "zod";

/**
 * Supported integration provider slugs.
 */
export const providerSlugSchema = z.enum([
  "stripe",
  "intercom",
  "slack",
  "github",
  "hubspot",
  "resend",
  "linear",
  "zendesk",
  "notion",
  "salesforce",
  "ms-teams",
  "datadog",
  "google-workspace",
]);

/** Integration lifecycle statuses. */
export const integrationStatusSchema = z.enum([
  "draft",
  "active",
  "disabled",
  "error",
]);

/** Surfaces that an integration can be enabled on. */
export const integrationSurfaceSchema = z.enum(["agents", "workflows"]);

/** Capability access modes. */
export const capabilityModeSchema = z.enum(["read", "write"]);

/** Connection test execution statuses. */
export const connectionTestStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);

/** Action run execution statuses. */
export const actionRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

/** Retry backoff strategy types. */
export const retryBackoffStrategySchema = z.enum(["fixed", "exponential"]);

/** Circuit breaker states. */
export const circuitBreakerStatusSchema = z.enum([
  "closed",
  "open",
  "half_open",
]);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Schema for a provider capability definition. */
export const capabilityDefinitionSchema = z
  .object({
    key: z.string(),
    surface: integrationSurfaceSchema,
    mode: capabilityModeSchema,
    title: z.string(),
    description: z.string(),
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/** Schema for retry policy configuration. */
export const retryPolicySchema = z
  .object({
    maxAttempts: z.number().int(),
    baseDelayMs: z.number().int(),
    maxDelayMs: z.number().int(),
    backoffStrategy: retryBackoffStrategySchema,
    jitterRatio: z.number(),
    retryableErrorCodes: z.array(z.string()),
  })
  .loose();

/** Schema for circuit breaker policy configuration. */
export const circuitPolicySchema = z
  .object({
    failureThreshold: z.number().int(),
    rollingWindowMs: z.number().int(),
    cooldownMs: z.number().int(),
    halfOpenSuccessThreshold: z.number().int(),
  })
  .loose();

/** Schema for timeout policy configuration. */
export const timeoutPolicySchema = z
  .object({
    defaultTimeoutMs: z.number().int(),
    allowRequestOverride: z.boolean(),
    maxTimeoutMs: z.number().int(),
    timeoutErrorCode: z.string(),
    timeoutRetryable: z.boolean(),
  })
  .loose();

/** Schema for a full provider definition including capabilities and policies. */
export const providerDefinitionSchema = z
  .object({
    slug: providerSlugSchema,
    displayName: z.string(),
    description: z.string(),
    authScheme: z.enum(["api_key", "bearer"]),
    configSchema: z.record(z.string(), z.unknown()),
    supportedSurfaces: z.array(integrationSurfaceSchema),
    capabilities: z.array(capabilityDefinitionSchema),
    retryPolicy: retryPolicySchema.optional(),
    circuitPolicy: circuitPolicySchema.optional(),
    timeoutPolicy: timeoutPolicySchema.optional(),
  })
  .loose();

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

/** Schema for integration authentication configuration. */
export const integrationAuthSchema = z
  .object({
    scheme: z.enum(["api_key", "bearer"]),
    secretRef: z.string(),
    lastValidatedAt: z.string().optional(),
  })
  .loose();

/** Schema for a fully installed integration. */
export const installedIntegrationSchema = z
  .object({
    id: z.string(),
    provider: providerSlugSchema,
    tenantId: z.string(),
    environmentId: z.string().optional(),
    displayName: z.string(),
    status: integrationStatusSchema,
    config: z.record(z.string(), z.unknown()),
    auth: integrationAuthSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.number().int(),
  })
  .loose();

/** Schema for per-surface integration state. */
export const integrationSurfaceStateSchema = z
  .object({
    integrationId: z.string(),
    surface: integrationSurfaceSchema,
    enabled: z.boolean(),
    updatedAt: z.string(),
  })
  .loose();

/** Schema for an installed capability with enabled state. */
export const installedCapabilitySchema = z
  .object({
    integrationId: z.string(),
    key: z.string(),
    surface: integrationSurfaceSchema,
    enabled: z.boolean(),
    mode: capabilityModeSchema,
    updatedAt: z.string(),
  })
  .loose();

/** Schema for integration metrics. */
export const integrationMetricsSchema = z
  .object({
    integrationId: z.string(),
    connectionTestsByStatus: z.record(z.string(), z.number()),
    actionRunsByStatus: z.record(z.string(), z.number()),
    latestValidationAt: z.string().optional(),
    enabledCapabilities: z.number().int(),
    enabledSurfaces: z.number().int(),
  })
  .loose();

/** Schema for configuration validation result. */
export const validateConfigurationResultSchema = z
  .object({
    valid: z.boolean(),
    message: z.string(),
    integration: installedIntegrationSchema,
  })
  .loose();

// ---------------------------------------------------------------------------
// Connection tests
// ---------------------------------------------------------------------------

/** Schema for a connection test result. */
export const connectionTestSchema = z
  .object({
    id: z.string(),
    integrationId: z.string(),
    actorId: z.string().optional(),
    status: connectionTestStatusSchema,
    message: z.string().optional(),
    startedAt: z.string(),
    finishedAt: z.string().optional(),
  })
  .loose();

// ---------------------------------------------------------------------------
// Action runs
// ---------------------------------------------------------------------------

/** Schema for an action run error. */
export const actionRunErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  })
  .loose();

/** Schema for action run retry metadata. */
export const actionRunRetryMetadataSchema = z
  .object({
    attemptCount: z.number().int(),
    maxAttempts: z.number().int(),
    nextRetryAt: z.string().optional(),
    lastFailureCode: z.string().optional(),
  })
  .loose();

/** Schema for action run idempotency metadata. */
export const actionRunIdempotencyMetadataSchema = z
  .object({
    status: z.enum(["new", "deduplicated", "conflict", "replayed"]),
    requestFingerprintHash: z.string(),
    canonicalActionRunId: z.string(),
  })
  .loose();

/** Schema for an action run. */
export const actionRunSchema = z
  .object({
    id: z.string(),
    integrationId: z.string(),
    surface: integrationSurfaceSchema,
    action: z.string(),
    actorId: z.string().optional(),
    status: actionRunStatusSchema,
    idempotencyKey: z.string().optional(),
    input: z.record(z.string(), z.unknown()),
    output: z.record(z.string(), z.unknown()).optional(),
    error: actionRunErrorSchema.optional(),
    retry: actionRunRetryMetadataSchema.optional(),
    idempotency: actionRunIdempotencyMetadataSchema.optional(),
    startedAt: z.string(),
    finishedAt: z.string().optional(),
  })
  .loose();

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

/** Input schema for creating a new integration. */
export const createIntegrationInputSchema = z.object({
  provider: providerSlugSchema,
  tenantId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
  auth: z.object({
    scheme: z.enum(["api_key", "bearer"]),
    secretRef: z.string().trim().min(1),
  }),
});

/** Input schema for updating an existing integration. */
export const updateIntegrationInputSchema = z
  .object({
    expectedVersion: z.number().int().min(1).optional(),
    displayName: z.string().trim().min(1).optional(),
    status: integrationStatusSchema.optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    auth: z
      .object({
        scheme: z.enum(["api_key", "bearer"]).optional(),
        secretRef: z.string().trim().min(1).optional(),
        lastValidatedAt: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .refine(
    (value: Record<string, unknown>) =>
      Object.keys(value).some((key) => key !== "expectedVersion"),
    {
      message: "At least one field must be provided",
    }
  );

/** Query schema for listing integrations. */
export const listIntegrationsQuerySchema = z.object({
  tenantId: z.string().trim().min(1),
  environmentId: z.string().trim().min(1).optional(),
  provider: providerSlugSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  includeTotal: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .transform((value) => {
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1";
    })
    .optional(),
});

/** Input schema for creating an action run. */
export const createActionRunInputSchema = z.object({
  surface: integrationSurfaceSchema,
  action: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().positive().max(3_600_000).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

/** Input schema for replaying an action run. */
export const replayActionRunInputSchema = z.object({
  idempotencyKey: z.string().trim().min(1).optional(),
});

/** Input schema for creating a connection test. */
export const createConnectionTestInputSchema = z.object({
  actorId: z.string().trim().min(1).optional(),
});

/** Input schema for toggling a surface. */
export const putSurfaceInputSchema = z.object({
  enabled: z.boolean(),
});

/** Input schema for toggling a capability. */
export const putCapabilityInputSchema = z.object({
  enabled: z.boolean(),
});

/** Input schema for bulk capability updates. */
export const bulkPutCapabilitiesInputSchema = z.object({
  capabilities: z
    .array(
      z.object({
        capabilityKey: z.string().trim().min(1),
        enabled: z.boolean(),
      })
    )
    .min(1),
});

/** Input schema for rotating an integration secret. */
export const rotateSecretInputSchema = z.object({
  secretRef: z.string().trim().min(1),
});

/** Generic pagination query schema. */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
});

/** Input schema for policy simulation. */
export const policySimulationInputSchema = z.object({
  requiredScopes: z.array(z.string().trim().min(1)),
  providedScopes: z.array(z.string().trim().min(1)).optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Supported provider slugs. */
export type ProviderSlug = z.infer<typeof providerSlugSchema>;
/** Integration lifecycle status. */
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
/** Integration surface identifier. */
export type IntegrationSurface = z.infer<typeof integrationSurfaceSchema>;
/** Capability access mode. */
export type CapabilityMode = z.infer<typeof capabilityModeSchema>;
/** Connection test status. */
export type ConnectionTestStatus = z.infer<typeof connectionTestStatusSchema>;
/** Action run status. */
export type ActionRunStatus = z.infer<typeof actionRunStatusSchema>;
/** Retry backoff strategy. */
export type RetryBackoffStrategy = z.infer<typeof retryBackoffStrategySchema>;
/** Circuit breaker status. */
export type CircuitBreakerStatus = z.infer<typeof circuitBreakerStatusSchema>;
/** Provider capability definition. */
export type CapabilityDefinition = z.infer<typeof capabilityDefinitionSchema>;
/** Retry policy configuration. */
export type RetryPolicy = z.infer<typeof retryPolicySchema>;
/** Circuit breaker policy configuration. */
export type CircuitPolicy = z.infer<typeof circuitPolicySchema>;
/** Timeout policy configuration. */
export type TimeoutPolicy = z.infer<typeof timeoutPolicySchema>;
/** Full provider definition. */
export type ProviderDefinition = z.infer<typeof providerDefinitionSchema>;
/** Integration authentication configuration. */
export type IntegrationAuth = z.infer<typeof integrationAuthSchema>;
/** Fully installed integration. */
export type InstalledIntegration = z.infer<typeof installedIntegrationSchema>;
/** Per-surface integration state. */
export type IntegrationSurfaceState = z.infer<
  typeof integrationSurfaceStateSchema
>;
/** Installed capability with enabled state. */
export type InstalledCapability = z.infer<typeof installedCapabilitySchema>;
/** Integration metrics. */
export type IntegrationMetrics = z.infer<typeof integrationMetricsSchema>;
/** Configuration validation result. */
export type ValidateConfigurationResult = z.infer<
  typeof validateConfigurationResultSchema
>;
/** Connection test result. */
export type ConnectionTest = z.infer<typeof connectionTestSchema>;
/** Action run error information. */
export type ActionRunError = z.infer<typeof actionRunErrorSchema>;
/** Action run retry metadata. */
export type ActionRunRetryMetadata = z.infer<
  typeof actionRunRetryMetadataSchema
>;
/** Action run idempotency metadata. */
export type ActionRunIdempotencyMetadata = z.infer<
  typeof actionRunIdempotencyMetadataSchema
>;
/** An action run. */
export type ActionRun = z.infer<typeof actionRunSchema>;
/** Input for creating an integration. */
export type CreateIntegrationInput = z.infer<
  typeof createIntegrationInputSchema
>;
/** Input for updating an integration. */
export type UpdateIntegrationInput = z.infer<
  typeof updateIntegrationInputSchema
>;
/** Query for listing integrations. */
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
/** Input for creating an action run. */
export type CreateActionRunInput = z.infer<typeof createActionRunInputSchema>;
/** Input for replaying an action run. */
export type ReplayActionRunInput = z.infer<typeof replayActionRunInputSchema>;
/** Input for creating a connection test. */
export type CreateConnectionTestInput = z.infer<
  typeof createConnectionTestInputSchema
>;
/** Input for toggling a surface. */
export type PutSurfaceInput = z.infer<typeof putSurfaceInputSchema>;
/** Input for toggling a capability. */
export type PutCapabilityInput = z.infer<typeof putCapabilityInputSchema>;
/** Input for bulk capability updates. */
export type BulkPutCapabilitiesInput = z.infer<
  typeof bulkPutCapabilitiesInputSchema
>;
/** Input for rotating a secret. */
export type RotateSecretInput = z.infer<typeof rotateSecretInputSchema>;
/** Generic pagination query. */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
/** Input for policy simulation. */
export type PolicySimulationInput = z.infer<typeof policySimulationInputSchema>;
