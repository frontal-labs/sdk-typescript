import {
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import { Installation } from "./installation";
import type {
  ConnectorDefinition,
  ConnectorInstallation,
  CreateInstallationInput,
  ListInstallationsQuery,
  ReplaySyncRunInput,
  SyncRun,
} from "./schemas";

export class ConnectorsService {
  readonly installations: InstallationsNamespace;

  constructor(private readonly http: HttpClient) {
    this.installations = new InstallationsNamespace(http);
  }

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------

  async list(): Promise<ConnectorDefinition[]> {
    const res = await this.http.get<{ connectors: ConnectorDefinition[] }>(
      "/connectors"
    );
    return res.connectors;
  }

  async get(slug: string): Promise<ConnectorDefinition> {
    return this.http.get<ConnectorDefinition>(`/connectors/${slug}`);
  }

  // ---------------------------------------------------------------------------
  // Global operations
  // ---------------------------------------------------------------------------

  async replay(
    syncRunId: string,
    input?: ReplaySyncRunInput
  ): Promise<SyncRun> {
    return this.http.post<SyncRun>(
      `/sync-runs/${syncRunId}/replay`,
      input ?? {}
    );
  }

  async diagnostics(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/diagnostics");
  }
}

// ---------------------------------------------------------------------------
// Installations namespace
// ---------------------------------------------------------------------------

export class InstallationsNamespace {
  constructor(private readonly http: HttpClient) {}

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
