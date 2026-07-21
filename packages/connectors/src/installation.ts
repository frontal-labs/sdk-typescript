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

/** A connector installation with associated sync, test, and checkpoint operations. */
export class Installation {
  /**
   * @param http - The HTTP client used for API requests.
   * @param id - Unique identifier for this installation.
   * @param connectorSlug - The connector type slug.
   * @param tenantId - The tenant this installation belongs to.
   * @param datasetNamespace - The dataset namespace for synced data.
   * @param displayName - A human-readable display name.
   * @param status - The current installation status.
   * @param config - Connector-specific configuration.
   * @param auth - Authentication configuration.
   * @param environmentId - Optional environment identifier.
   * @param createdAt - Creation timestamp.
   * @param updatedAt - Last update timestamp.
   */
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

  /** Namespace for sync run operations. */
  readonly sync: SyncNamespace;
  /** Namespace for connection test operations. */
  readonly test: TestNamespace;
  /** Namespace for checkpoint operations. */
  readonly checkpoint: CheckpointNamespace;

  /** Refreshes this installation's data from the API. */
  async reload(): Promise<Installation> {
    const fresh = await this.http.get<ConnectorInstallation>(
      `/connectors/installations/${this.id}`
    );
    return copyInto(this, fresh);
  }

  /** Update the installation's configuration. */
  async update(input: UpdateInstallationInput): Promise<Installation> {
    const updated = await this.http.patch<ConnectorInstallation>(
      `/connectors/installations/${this.id}`,
      input
    );
    return copyInto(this, updated);
  }

  /** Delete this installation. */
  async remove(): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(
      `/connectors/installations/${this.id}`
    );
  }

  /** Pause this installation. */
  async pause(): Promise<Installation> {
    const result = await this.http.post<ConnectorInstallation>(
      `/connectors/installations/${this.id}/pause`,
      {}
    );
    return copyInto(this, result);
  }

  /** Resume a paused installation. */
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
      createdAt: this.createdAt ?? new Date().toISOString(),
      updatedAt: this.updatedAt ?? new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Namespace for sync run operations on an installation. */
export class SyncNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   * @param installationId - The parent installation's ID.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/sync-runs`;
  }

  /**
   * Start a new sync run.
   * @param input - Optional trigger and mode overrides.
   * @returns The created sync run.
   */
  async create(input?: CreateSyncRunInput): Promise<SyncRun> {
    return this.http.post<SyncRun>(this.base(), input ?? {});
  }

  /** List sync runs for this installation. */
  async list(): Promise<PageResult<SyncRun>> {
    const raw = await this.http.get<{ runs: SyncRun[] }>(this.base());
    return createPageResult(raw.runs, {
      cursor: "",
      hasMore: false,
      total: raw.runs.length,
    });
  }

  /** Get a specific sync run by ID. */
  async get(runId: string): Promise<SyncRun> {
    return this.http.get<SyncRun>(`${this.base()}/${runId}`);
  }

  /**
   * Start a sync run and wait for it to complete.
   * @param input - Optional trigger and mode overrides.
   * @param opts - Polling options (interval and timeout).
   * @returns The completed sync run.
   */
  async wait(
    input?: CreateSyncRunInput,
    opts?: { interval?: number; timeout?: number }
  ): Promise<SyncRun> {
    const run = await this.create(input);
    return pollUntil(() => this.get(run.id), {
      interval: opts?.interval ?? 2000,
      timeout: opts?.timeout ?? 300_000,
      until: (r: SyncRun) => r.status === "succeeded" || r.status === "failed",
    });
  }
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

/** Namespace for connection test operations on an installation. */
export class TestNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   * @param installationId - The parent installation's ID.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/connection-tests`;
  }

  /**
   * Run a connection test.
   * @param actorId - Optional actor ID to attribute the test.
   * @returns The created connection test.
   */
  async create(actorId?: string): Promise<ConnectionTest> {
    return this.http.post<ConnectionTest>(
      this.base(),
      actorId ? { actorId } : {}
    );
  }

  /** List connection tests for this installation. */
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

  /** Get a specific connection test by ID. */
  async get(testId: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(
      `/connectors/connection-tests/${testId}`
    );
  }

  /**
   * Run a connection test and wait for it to complete.
   * @param actorId - Optional actor ID to attribute the test.
   * @param opts - Polling options (interval and timeout).
   * @returns The completed connection test.
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
// Checkpoint
// ---------------------------------------------------------------------------

/** Namespace for checkpoint operations on an installation. */
export class CheckpointNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   * @param installationId - The parent installation's ID.
   */
  constructor(
    private readonly http: HttpClient,
    private readonly installationId: string
  ) {}

  private base() {
    return `/connectors/installations/${this.installationId}/checkpoint`;
  }

  /** Get the current checkpoint for this installation. */
  async get(): Promise<ConnectorCheckpoint | null> {
    return this.http.get<ConnectorCheckpoint | null>(this.base());
  }

  /** Reset the checkpoint, clearing sync progress. */
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
