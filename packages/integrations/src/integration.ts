import {
  createPageResult,
  type HttpClient,
  type PageResult,
  pollUntil,
} from "@frontal-labs/core";
import type {
  ActionRun,
  ConnectionTest,
  CreateActionRunInput,
  InstalledCapability,
  InstalledIntegration,
  IntegrationMetrics,
  IntegrationSurface,
  IntegrationSurfaceState,
  UpdateIntegrationInput,
  ValidateConfigurationResult,
} from "./schemas";

export class Integration {
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

  readonly run: RunNamespace;
  readonly test: TestNamespace;
  readonly capabilities: CapabilitiesNamespace;
  readonly surfaces: SurfacesNamespace;

  async reload(): Promise<Integration> {
    const fresh = await this.http.get<InstalledIntegration>(
      `/integrations/${this.id}`
    );
    return copyInto(this, fresh);
  }

  async update(input: UpdateIntegrationInput): Promise<Integration> {
    const updated = await this.http.patch<InstalledIntegration>(
      `/integrations/${this.id}`,
      input
    );
    return copyInto(this, updated);
  }

  async remove(): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/integrations/${this.id}`);
  }

  async validate(): Promise<ValidateConfigurationResult> {
    return this.http.post<ValidateConfigurationResult>(
      `/integrations/${this.id}/validate-configuration`,
      {}
    );
  }

  async rotateSecret(secretRef: string): Promise<Integration> {
    const result = await this.http.post<InstalledIntegration>(
      `/integrations/${this.id}/rotate-secret`,
      { secretRef }
    );
    return copyInto(this, result);
  }

  async metrics(): Promise<IntegrationMetrics> {
    return this.http.get<IntegrationMetrics>(
      `/integrations/${this.id}/metrics`
    );
  }

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
      createdAt: this.createdAt ?? "",
      updatedAt: this.updatedAt ?? "",
    };
  }
}

// ---------------------------------------------------------------------------
// Action runs
// ---------------------------------------------------------------------------

export class RunNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  private base() {
    return `/integrations/${this.integrationId}/action-runs`;
  }

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

  async get(runId: string): Promise<ActionRun> {
    return this.http.get<ActionRun>(`/action-runs/${runId}`);
  }

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
      interval: opts?.interval ?? 2_000,
      timeout: opts?.timeout ?? 300_000,
      until: (r) =>
        r.status === "succeeded" ||
        r.status === "failed" ||
        r.status === "cancelled",
    });
  }
}

// ---------------------------------------------------------------------------
// Connection tests
// ---------------------------------------------------------------------------

export class TestNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  private base() {
    return `/integrations/${this.integrationId}/connection-tests`;
  }

  async create(actorId?: string): Promise<ConnectionTest> {
    return this.http.post<ConnectionTest>(
      this.base(),
      actorId ? { actorId } : {}
    );
  }

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

  async get(testId: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(`/connection-tests/${testId}`);
  }

  async wait(
    actorId?: string,
    opts?: { interval?: number; timeout?: number }
  ): Promise<ConnectionTest> {
    const ct = await this.create(actorId);
    return pollUntil(() => this.get(ct.id), {
      interval: opts?.interval ?? 2_000,
      timeout: opts?.timeout ?? 60_000,
      until: (t) => t.status === "succeeded" || t.status === "failed",
    });
  }
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export class CapabilitiesNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

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

  async enable(key: string): Promise<InstalledCapability> {
    return this.http.put<InstalledCapability>(
      `/integrations/${this.integrationId}/capabilities/${encodeURIComponent(key)}`,
      { enabled: true }
    );
  }

  async disable(key: string): Promise<InstalledCapability> {
    return this.http.put<InstalledCapability>(
      `/integrations/${this.integrationId}/capabilities/${encodeURIComponent(key)}`,
      { enabled: false }
    );
  }

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

export class SurfacesNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly integrationId: string
  ) {}

  async list(): Promise<IntegrationSurfaceState[]> {
    const res = await this.http.get<{
      surfaces: IntegrationSurfaceState[];
    }>(`/integrations/${this.integrationId}/surfaces`);
    return res.surfaces;
  }

  async enable(surface: IntegrationSurface): Promise<IntegrationSurfaceState> {
    return this.http.put<IntegrationSurfaceState>(
      `/integrations/${this.integrationId}/surfaces/${surface}`,
      { enabled: true }
    );
  }

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
