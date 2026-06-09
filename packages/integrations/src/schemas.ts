import { z } from "zod";

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

export const integrationStatusSchema = z.enum([
  "draft",
  "active",
  "disabled",
  "error",
]);

export const integrationSurfaceSchema = z.enum(["agents", "workflows"]);

export const capabilityModeSchema = z.enum(["read", "write"]);

export const connectionTestStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const actionRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const retryBackoffStrategySchema = z.enum(["fixed", "exponential"]);

export const circuitBreakerStatusSchema = z.enum([
  "closed",
  "open",
  "half_open",
]);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

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
  .passthrough();

export const retryPolicySchema = z
  .object({
    maxAttempts: z.number().int(),
    baseDelayMs: z.number().int(),
    maxDelayMs: z.number().int(),
    backoffStrategy: retryBackoffStrategySchema,
    jitterRatio: z.number(),
    retryableErrorCodes: z.array(z.string()),
  })
  .passthrough();

export const circuitPolicySchema = z
  .object({
    failureThreshold: z.number().int(),
    rollingWindowMs: z.number().int(),
    cooldownMs: z.number().int(),
    halfOpenSuccessThreshold: z.number().int(),
  })
  .passthrough();

export const timeoutPolicySchema = z
  .object({
    defaultTimeoutMs: z.number().int(),
    allowRequestOverride: z.boolean(),
    maxTimeoutMs: z.number().int(),
    timeoutErrorCode: z.string(),
    timeoutRetryable: z.boolean(),
  })
  .passthrough();

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
  .passthrough();

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

export const integrationAuthSchema = z
  .object({
    scheme: z.enum(["api_key", "bearer"]),
    secretRef: z.string(),
    lastValidatedAt: z.string().optional(),
  })
  .passthrough();

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
  .passthrough();

export const integrationSurfaceStateSchema = z
  .object({
    integrationId: z.string(),
    surface: integrationSurfaceSchema,
    enabled: z.boolean(),
    updatedAt: z.string(),
  })
  .passthrough();

export const installedCapabilitySchema = z
  .object({
    integrationId: z.string(),
    key: z.string(),
    surface: integrationSurfaceSchema,
    enabled: z.boolean(),
    mode: capabilityModeSchema,
    updatedAt: z.string(),
  })
  .passthrough();

export const integrationMetricsSchema = z
  .object({
    integrationId: z.string(),
    connectionTestsByStatus: z.record(z.string(), z.number()),
    actionRunsByStatus: z.record(z.string(), z.number()),
    latestValidationAt: z.string().optional(),
    enabledCapabilities: z.number().int(),
    enabledSurfaces: z.number().int(),
  })
  .passthrough();

export const validateConfigurationResultSchema = z
  .object({
    valid: z.boolean(),
    message: z.string(),
    integration: installedIntegrationSchema,
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Connection tests
// ---------------------------------------------------------------------------

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
  .passthrough();

// ---------------------------------------------------------------------------
// Action runs
// ---------------------------------------------------------------------------

export const actionRunErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  })
  .passthrough();

export const actionRunRetryMetadataSchema = z
  .object({
    attemptCount: z.number().int(),
    maxAttempts: z.number().int(),
    nextRetryAt: z.string().optional(),
    lastFailureCode: z.string().optional(),
  })
  .passthrough();

export const actionRunIdempotencyMetadataSchema = z
  .object({
    status: z.enum(["new", "deduplicated", "conflict", "replayed"]),
    requestFingerprintHash: z.string(),
    canonicalActionRunId: z.string(),
  })
  .passthrough();

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
  .passthrough();

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

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

export const createActionRunInputSchema = z.object({
  surface: integrationSurfaceSchema,
  action: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().positive().max(3_600_000).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

export const replayActionRunInputSchema = z.object({
  idempotencyKey: z.string().trim().min(1).optional(),
});

export const createConnectionTestInputSchema = z.object({
  actorId: z.string().trim().min(1).optional(),
});

export const putSurfaceInputSchema = z.object({
  enabled: z.boolean(),
});

export const putCapabilityInputSchema = z.object({
  enabled: z.boolean(),
});

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

export const rotateSecretInputSchema = z.object({
  secretRef: z.string().trim().min(1),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
});

export const policySimulationInputSchema = z.object({
  requiredScopes: z.array(z.string().trim().min(1)),
  providedScopes: z.array(z.string().trim().min(1)).optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type ProviderSlug = z.infer<typeof providerSlugSchema>;
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type IntegrationSurface = z.infer<typeof integrationSurfaceSchema>;
export type CapabilityMode = z.infer<typeof capabilityModeSchema>;
export type ConnectionTestStatus = z.infer<typeof connectionTestStatusSchema>;
export type ActionRunStatus = z.infer<typeof actionRunStatusSchema>;
export type RetryBackoffStrategy = z.infer<typeof retryBackoffStrategySchema>;
export type CircuitBreakerStatus = z.infer<typeof circuitBreakerStatusSchema>;
export type CapabilityDefinition = z.infer<typeof capabilityDefinitionSchema>;
export type RetryPolicy = z.infer<typeof retryPolicySchema>;
export type CircuitPolicy = z.infer<typeof circuitPolicySchema>;
export type TimeoutPolicy = z.infer<typeof timeoutPolicySchema>;
export type ProviderDefinition = z.infer<typeof providerDefinitionSchema>;
export type IntegrationAuth = z.infer<typeof integrationAuthSchema>;
export type InstalledIntegration = z.infer<typeof installedIntegrationSchema>;
export type IntegrationSurfaceState = z.infer<
  typeof integrationSurfaceStateSchema
>;
export type InstalledCapability = z.infer<typeof installedCapabilitySchema>;
export type IntegrationMetrics = z.infer<typeof integrationMetricsSchema>;
export type ValidateConfigurationResult = z.infer<
  typeof validateConfigurationResultSchema
>;
export type ConnectionTest = z.infer<typeof connectionTestSchema>;
export type ActionRunError = z.infer<typeof actionRunErrorSchema>;
export type ActionRunRetryMetadata = z.infer<
  typeof actionRunRetryMetadataSchema
>;
export type ActionRunIdempotencyMetadata = z.infer<
  typeof actionRunIdempotencyMetadataSchema
>;
export type ActionRun = z.infer<typeof actionRunSchema>;
export type CreateIntegrationInput = z.infer<
  typeof createIntegrationInputSchema
>;
export type UpdateIntegrationInput = z.infer<
  typeof updateIntegrationInputSchema
>;
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
export type CreateActionRunInput = z.infer<typeof createActionRunInputSchema>;
export type ReplayActionRunInput = z.infer<typeof replayActionRunInputSchema>;
export type CreateConnectionTestInput = z.infer<
  typeof createConnectionTestInputSchema
>;
export type PutSurfaceInput = z.infer<typeof putSurfaceInputSchema>;
export type PutCapabilityInput = z.infer<typeof putCapabilityInputSchema>;
export type BulkPutCapabilitiesInput = z.infer<
  typeof bulkPutCapabilitiesInputSchema
>;
export type RotateSecretInput = z.infer<typeof rotateSecretInputSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PolicySimulationInput = z.infer<typeof policySimulationInputSchema>;
