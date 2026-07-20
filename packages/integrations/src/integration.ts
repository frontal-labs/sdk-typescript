import {
  createPageResult,
  type HttpClient,
  type PageResult,
  pollUntil,
} from "@frontal-labs/core";
import type {
  ActionRun,
  ConnectionTest,
  InstalledCapability,
  InstalledIntegration,
  IntegrationMetrics,
  IntegrationSurface,
  IntegrationSurfaceState,
  UpdateIntegrationInput,
  ValidateConfigurationResult,
} from "./schemas";

/**
 * Represents an installed Frontal integration with its provider configuration,
 * authentication, and operational sub-namespaces for runs, tests, capabilities,
 * and surfaces.
 */
export class Integration {
  /**
   * @param http - The shared HTTP client.
   * @param id - Unique integration ID.
   * @param provider - Provider slug identifier.
   * @param tenantId - Tenant that owns this integration.
   * @param displayName - Human-readable display name.
   * @param status - Current integration status.
   * @param config - Provider-specific configuration.
   * @param auth - Authentication scheme and secret reference.
   * @param version - Current version number for optimistic concurrency.
   * @param environmentId - Optional environment scope.
   * @param createdAt - ISO timestamp of creation.
   * @param updatedAt - ISO timestamp of last update.
   */
  constructor(
    private readonly http: HttpClient,
    public id: string,
    public provider: string,
    public tenantId: string,
    public displayName: string,
    public status: string,
    public config: Record<string, unknown>,
    public auth: {
      scheme: string;
      secretRef: string;
      lastValidatedAt?: string;
    },
    public version: number,
    public environmentId?: string,
    public createdAt?: string,
    public updatedAt?: string
  ) {
    this.run = new RunNamespace(http, id);
    this.test = new TestNamespace(http, id);
    this.capabilities = new CapabilitiesNamespace(http, id);
    this.surfaces = new SurfacesNamespace(http, id);
  }

  /** Action run operations for this integration. */
  readonly run: RunNamespace;
  /** Connection test operations for this integration. */
  readonly test: TestNamespace;
  /** Capability management for this integration. */
  readonly capabilities: CapabilitiesNamespace;
  /** Surface management for this integration. */
  readonly surfaces: SurfacesNamespace;

  /** Reload the integration state from the API. */
  async reload(): Promise<Integration> {
    const fresh = await this.http.get<InstalledIntegration>(
      `/integrations/${this.id}`
    );
    return copyInto(this, fresh);
  }

  /** Update the integration's configuration or metadata. */
  async update(input: UpdateIntegrationInput): Promise<Integration> {
    const updated = await this.http.patch<InstalledIntegration>(
      `/integrations/${this.id}`,
      input
    );
    return copyInto(this, updated);
  }

  /** Delete this integration. */
  async remove(): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/integrations/${this.id}`);
  }

  /** Validate the current integration configuration. */
  async validate(): Promise<ValidateConfigurationResult> {
    return this.http.post<ValidateConfigurationResult>(
      `/integrations/${this.id}/validate-configuration`,
      {}
    );
  }

  /** Rotate the integration's secret reference. */
  async rotateSecret(secretRef: string): Promise<Integration> {
    const result = await this.http.post<InstalledIntegration>(
      `/integrations/${this.id}/rotate-secret`,
      { secretRef }
    );
    return copyInto(this, result);
  }

  /** Get operational metrics for this integration. */
  async metrics(): Promise<IntegrationMetrics> {
    return this.http.get<IntegrationMetrics>(
      `/integrations/${this.id}/metrics`
    );
  }

  /** Serialize to a plain `InstalledIntegration` object. */
  toJSON(): InstalledIntegration {
    return {
      id: this.id,
      provider: this.provider as never,
      tenantId: this.tenantId,
      displayName: this.displayName,
      status: this.status as never,
      config: this.config,
      auth: this.auth as never,
      version: this.version,
      ...(this.environmentId ? { environmentId: this.environmentId } : {}),
      createdAt: this.createdAt ?? new Date().toISOString(),
      updatedAt: this.updatedAt ?? new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Action runs
// ---------------------------------------------------------------------------

/** Namespace for action run operations on a specific integration. */
export class RunNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  private base() {
    return `/integrations/${this.integrationId}/action-runs`;
  }

  /**
   * Create a new action run.
   * @param action - The action identifier to execute.
   * @param input - Input parameters for the action.
   * @param opts - Optional surface, actor, idempotency key, and timeout.
   */
  async create(
    action: string,
    input: Record<string, unknown>,
    opts?: {
      surface?: IntegrationSurface;
      actorId?: string;
      idempotencyKey?: string;
      timeoutMs?: number;
    }
  ): Promise<ActionRun> {
    return this.http.post<ActionRun>(this.base(), {
      surface: opts?.surface ?? "agents",
      action,
      input,
      ...(opts?.actorId ? { actorId: opts.actorId } : {}),
      ...(opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
      ...(opts?.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    });
  }

  /**
   * List action runs with optional pagination.
   * @param query - Pagination cursor and limit.
   */
  async list(query?: {
    limit?: number;
    cursor?: string;
  }): Promise<PageResult<ActionRun>> {
    const raw = await this.http.get<{
      actionRuns: ActionRun[];
      total: number;
      nextCursor?: string;
    }>(this.base(), query ?? {});
    return createPageResult(
      raw.actionRuns,
      {
        cursor: raw.nextCursor ?? "",
        hasMore: Boolean(raw.nextCursor),
        total: raw.total,
      },
      raw.nextCursor
        ? (cursor: string) => this.list({ ...query, cursor })
        : undefined
    );
  }

  /** Get a single action run by ID. */
  async get(runId: string): Promise<ActionRun> {
    return this.http.get<ActionRun>(`/action-runs/${runId}`);
  }

  /**
   * Create an action run and poll until it reaches a terminal state.
   * @param action - The action identifier to execute.
   * @param input - Input parameters for the action.
   * @param opts - Options including poll interval and timeout.
   */
  async wait(
    action: string,
    input: Record<string, unknown>,
    opts?: {
      surface?: IntegrationSurface;
      actorId?: string;
      idempotencyKey?: string;
      timeoutMs?: number;
      interval?: number;
      timeout?: number;
    }
  ): Promise<ActionRun> {
    const run = await this.create(action, input, opts);
    return pollUntil(() => this.get(run.id), {
      interval: opts?.interval ?? 2000,
      timeout: opts?.timeout ?? 300_000,
      until: (r: ActionRun) =>
        r.status === "succeeded" ||
        r.status === "failed" ||
        r.status === "cancelled",
    });
  }
}

// ---------------------------------------------------------------------------
// Connection tests
// ---------------------------------------------------------------------------

/** Namespace for connection test operations on a specific integration. */
export class TestNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  private base() {
    return `/integrations/${this.integrationId}/connection-tests`;
  }

  /**
   * Create a new connection test.
   * @param actorId - Optional actor ID to test impersonation.
   */
  async create(actorId?: string): Promise<ConnectionTest> {
    return this.http.post<ConnectionTest>(
      this.base(),
      actorId ? { actorId } : {}
    );
  }

  /**
   * List connection tests with optional pagination.
   * @param query - Pagination cursor and limit.
   */
  async list(query?: {
    limit?: number;
    cursor?: string;
  }): Promise<PageResult<ConnectionTest>> {
    const raw = await this.http.get<{
      connectionTests: ConnectionTest[];
      total: number;
      nextCursor?: string;
    }>(this.base(), query ?? {});
    return createPageResult(
      raw.connectionTests,
      {
        cursor: raw.nextCursor ?? "",
        hasMore: Boolean(raw.nextCursor),
        total: raw.total,
      },
      raw.nextCursor
        ? (cursor: string) => this.list({ ...query, cursor })
        : undefined
    );
  }

  /** Get a single connection test by ID. */
  async get(testId: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(`/connection-tests/${testId}`);
  }

  /**
   * Create a connection test and poll until it completes.
   * @param actorId - Optional actor ID.
   * @param opts - Poll interval and timeout.
   */
  async wait(
    actorId?: string,
    opts?: { interval?: number; timeout?: number }
  ): Promise<ConnectionTest> {
    const ct = await this.create(actorId);
    return pollUntil(() => this.get(ct.id), {
      interval: opts?.interval ?? 2000,
      timeout: opts?.timeout ?? 60_000,
      until: (t: ConnectionTest) =>
        t.status === "succeeded" || t.status === "failed",
    });
  }
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Namespace for capability management on a specific integration. */
export class CapabilitiesNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  /**
   * List installed capabilities with optional pagination.
   * @param query - Pagination cursor and limit.
   */
  async list(query?: {
    limit?: number;
    cursor?: string;
  }): Promise<PageResult<InstalledCapability>> {
    const raw = await this.http.get<{
      capabilities: InstalledCapability[];
      total: number;
      nextCursor?: string;
    }>(`/integrations/${this.integrationId}/capabilities`, query ?? {});
    return createPageResult(
      raw.capabilities,
      {
        cursor: raw.nextCursor ?? "",
        hasMore: Boolean(raw.nextCursor),
        total: raw.total,
      },
      raw.nextCursor
        ? (cursor: string) => this.list({ ...query, cursor })
        : undefined
    );
  }

  /** Enable a capability by its key. */
  async enable(key: string): Promise<InstalledCapability> {
    return this.http.put<InstalledCapability>(
      `/integrations/${this.integrationId}/capabilities/${encodeURIComponent(key)}`,
      { enabled: true }
    );
  }

  /** Disable a capability by its key. */
  async disable(key: string): Promise<InstalledCapability> {
    return this.http.put<InstalledCapability>(
      `/integrations/${this.integrationId}/capabilities/${encodeURIComponent(key)}`,
      { enabled: false }
    );
  }

  /** Bulk enable or disable capabilities. */
  async bulkSet(
    entries: Array<{ capabilityKey: string; enabled: boolean }>
  ): Promise<{ capabilities: InstalledCapability[]; total: number }> {
    return this.http.put<{
      capabilities: InstalledCapability[];
      total: number;
    }>(`/integrations/${this.integrationId}/capabilities:bulk`, {
      capabilities: entries,
    });
  }
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/** Namespace for surface configuration on a specific integration. */
export class SurfacesNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  /** List all surface states for this integration. */
  async list(): Promise<IntegrationSurfaceState[]> {
    const res = await this.http.get<{
      surfaces: IntegrationSurfaceState[];
    }>(`/integrations/${this.integrationId}/surfaces`);
    return res.surfaces;
  }

  /** Enable a surface (e.g. "agents" or "workflows"). */
  async enable(surface: IntegrationSurface): Promise<IntegrationSurfaceState> {
    return this.http.put<IntegrationSurfaceState>(
      `/integrations/${this.integrationId}/surfaces/${surface}`,
      { enabled: true }
    );
  }

  /** Disable a surface. */
  async disable(surface: IntegrationSurface): Promise<IntegrationSurfaceState> {
    return this.http.put<IntegrationSurfaceState>(
      `/integrations/${this.integrationId}/surfaces/${surface}`,
      { enabled: false }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyInto(
  target: Integration,
  source: InstalledIntegration
): Integration {
  target.id = source.id;
  target.provider = source.provider;
  target.tenantId = source.tenantId;
  target.displayName = source.displayName;
  target.status = source.status;
  target.config = source.config;
  target.auth = source.auth;
  target.version = source.version;
  target.environmentId = source.environmentId;
  target.createdAt = source.createdAt;
  target.updatedAt = source.updatedAt;
  return target;
}
