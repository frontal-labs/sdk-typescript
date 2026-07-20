import {
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/_core";
import { Installation } from "./installation";
import type {
  ConnectorDefinition,
  ConnectorInstallation,
  CreateInstallationInput,
  ListInstallationsQuery,
  ReplaySyncRunInput,
  SyncRun,
} from "./schemas";

/** Client for the Frontal Connectors API. Manages connector catalog, installations, sync runs, and connection tests. */
export class ConnectorsSdk {
  /** Namespace for installation operations. */
  readonly installations: InstallationsNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.installations = new InstallationsNamespace(http);
  }

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------

  /** List all available connector definitions from the catalog. */
  async list(): Promise<ConnectorDefinition[]> {
    const res = await this.http.get<{ connectors: ConnectorDefinition[] }>(
      "/connectors/catalog"
    );
    return res.connectors;
  }

  /** Get a connector definition by its slug. */
  async get(slug: string): Promise<ConnectorDefinition> {
    return this.http.get<ConnectorDefinition>(`/connectors/catalog/${slug}`);
  }

  // ---------------------------------------------------------------------------
  // Global operations
  // ---------------------------------------------------------------------------

  /** Replay a sync run. */
  async replay(
    syncRunId: string,
    input?: ReplaySyncRunInput
  ): Promise<SyncRun> {
    return this.http.post<SyncRun>(
      `/connectors/sync-runs/${syncRunId}/replay`,
      input ?? {}
    );
  }

  /** Get diagnostics information. */
  async diagnostics(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/diagnostics");
  }
}

// ---------------------------------------------------------------------------
// Installations namespace
// ---------------------------------------------------------------------------

/** Namespace for connector installation operations. */
export class InstallationsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /** List installations matching the query. */
  async list(
    query: ListInstallationsQuery
  ): Promise<PageResult<ConnectorInstallation>> {
    const raw = await this.http.get<{
      installations: ConnectorInstallation[];
    }>("/connectors/installations", query);
    return createPageResult(raw.installations, {
      cursor: "",
      hasMore: false,
      total: raw.installations.length,
    });
  }

  /** Create a new connector installation. */
  async create(input: CreateInstallationInput): Promise<Installation> {
    const inst = await this.http.post<ConnectorInstallation>(
      "/connectors/installations",
      input
    );
    return new Installation(
      this.http,
      inst.id,
      inst.connectorSlug,
      inst.tenantId,
      inst.datasetNamespace,
      inst.displayName,
      inst.status,
      inst.config,
      inst.auth,
      inst.environmentId,
      inst.createdAt,
      inst.updatedAt
    );
  }

  /** Get a connector installation by ID. */
  async get(id: string): Promise<Installation> {
    const inst = await this.http.get<ConnectorInstallation>(
      `/connectors/installations/${id}`
    );
    return new Installation(
      this.http,
      inst.id,
      inst.connectorSlug,
      inst.tenantId,
      inst.datasetNamespace,
      inst.displayName,
      inst.status,
      inst.config,
      inst.auth,
      inst.environmentId,
      inst.createdAt,
      inst.updatedAt
    );
  }
}
