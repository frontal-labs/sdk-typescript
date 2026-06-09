import {
  createPageResult,
  type HttpClient,
  type PageResult,
  pollUntil,
} from "@frontal-labs/core";
import type {
  ConnectorCheckpoint,
  ConnectorInstallation,
  ConnectionTest,
  CreateSyncRunInput,
  SyncRun,
  UpdateInstallationInput,
} from "./schemas";

export class Installation {
  constructor(
    private readonly http: HttpClient,
    public id: string,
    public connectorSlug: string,
    public tenantId: string,
    public datasetNamespace: string,
    public displayName: string,
    public status: string,
    public config: Record<string, unknown>,
    public auth: {
      mode: string;
      secretRef?: string;
      lastValidatedAt?: string;
    },
    public environmentId?: string,
    public createdAt?: string,
    public updatedAt?: string
  ) {
    this.sync = new SyncNamespace(http, id);
    this.test = new TestNamespace(http, id);
    this.checkpoint = new CheckpointNamespace(http, id);
  }

  readonly sync: SyncNamespace;
  readonly test: TestNamespace;
  readonly checkpoint: CheckpointNamespace;

  async reload(): Promise<Installation> {
    const fresh = await this.http.get<ConnectorInstallation>(
      `/connectors/installations/${this.id}`
    );
    return copyInto(this, fresh);
  }

  async update(input: UpdateInstallationInput): Promise<Installation> {
    const updated = await this.http.patch<ConnectorInstallation>(
      `/connectors/installations/${this.id}`,
      input
    );
    return copyInto(this, updated);
  }

  async remove(): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `/connectors/installations/${this.id}`
    );
  }

  async pause(): Promise<Installation> {
    const result = await this.http.post<ConnectorInstallation>(
      `/connectors/installations/${this.id}/pause`,
      {}
    );
    return copyInto(this, result);
  }

  async resume(): Promise<Installation> {
    const result = await this.http.post<ConnectorInstallation>(
      `/connectors/installations/${this.id}/resume`,
      {}
    );
    return copyInto(this, result);
  }

  toJSON(): ConnectorInstallation {
    return {
      id: this.id,
      connectorSlug: this.connectorSlug as never,
      tenantId: this.tenantId,
      datasetNamespace: this.datasetNamespace,
      displayName: this.displayName,
      status: this.status as never,
      config: this.config,
      auth: this.auth as never,
      ...(this.environmentId ? { environmentId: this.environmentId } : {}),
      createdAt: this.createdAt ?? "",
      updatedAt: this.updatedAt ?? "",
    };
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export class SyncNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/sync-runs`;
  }

  async create(input?: CreateSyncRunInput): Promise<SyncRun> {
    return this.http.post<SyncRun>(this.base(), input ?? {});
  }

  async list(): Promise<PageResult<SyncRun>> {
    const raw = await this.http.get<{ runs: SyncRun[] }>(this.base());
    return createPageResult(raw.runs, {
      cursor: "",
      hasMore: false,
      total: raw.runs.length,
    });
  }

  async get(runId: string): Promise<SyncRun> {
    return this.http.get<SyncRun>(`${this.base()}/${runId}`);
  }

  async wait(
    input?: CreateSyncRunInput,
    opts?: { interval?: number; timeout?: number }
  ): Promise<SyncRun> {
    const run = await this.create(input);
    return pollUntil(() => this.get(run.id), {
      interval: opts?.interval ?? 2_000,
      timeout: opts?.timeout ?? 300_000,
      until: (r) => r.status === "succeeded" || r.status === "failed",
    });
  }
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

export class TestNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/connection-tests`;
  }

  async create(actorId?: string): Promise<ConnectionTest> {
    return this.http.post<ConnectionTest>(
      this.base(),
      actorId ? { actorId } : {}
    );
  }

  async list(): Promise<PageResult<ConnectionTest>> {
    const raw = await this.http.get<{ connectionTests: ConnectionTest[] }>(
      this.base()
    );
    return createPageResult(raw.connectionTests, {
      cursor: "",
      hasMore: false,
      total: raw.connectionTests.length,
    });
  }

  async get(testId: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(
      `/connectors/connection-tests/${testId}`
    );
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
// Checkpoint
// ---------------------------------------------------------------------------

export class CheckpointNamespace {
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/checkpoint`;
  }

  async get(): Promise<ConnectorCheckpoint | null> {
    return this.http.get<ConnectorCheckpoint | null>(this.base());
  }

  async reset(): Promise<ConnectorCheckpoint> {
    return this.http.post<ConnectorCheckpoint>(`${this.base()}/reset`, {});
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyInto(
  target: Installation,
  source: ConnectorInstallation
): Installation {
  target.id = source.id;
  target.connectorSlug = source.connectorSlug;
  target.tenantId = source.tenantId;
  target.datasetNamespace = source.datasetNamespace;
  target.displayName = source.displayName;
  target.status = source.status;
  target.config = source.config;
  target.auth = source.auth;
  target.environmentId = source.environmentId;
  target.createdAt = source.createdAt;
  target.updatedAt = source.updatedAt;
  return target;
}
