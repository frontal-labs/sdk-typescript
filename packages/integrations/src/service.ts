import {
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
import { Integration } from "./integration";
import type {
  ActionRun,
  ConnectionTest,
  CreateIntegrationInput,
  InstalledIntegration,
  ListIntegrationsQuery,
  ProviderDefinition,
  ReplayActionRunInput,
} from "./schemas";

export class IntegrationsService {
  readonly providers: ProvidersNamespace;
  readonly policy: PolicyNamespace;

  constructor(private readonly http: HttpClient) {
    this.providers = new ProvidersNamespace(http);
    this.policy = new PolicyNamespace(http);
  }

  // ---------------------------------------------------------------------------
  // Integrations
  // ---------------------------------------------------------------------------

  async list(
    query: ListIntegrationsQuery
  ): Promise<PageResult<InstalledIntegration>> {
    const raw = await this.http.get<{
      integrations: InstalledIntegration[];
      total: number;
      nextCursor?: string;
    }>("/integrations", query);
    return createPageResult(
      raw.integrations,
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

  async create(input: CreateIntegrationInput): Promise<Integration> {
    const inst = await this.http.post<InstalledIntegration>(
      "/integrations",
      input
    );
    return toIntegration(this.http, inst);
  }

  async get(id: string): Promise<Integration> {
    const inst = await this.http.get<InstalledIntegration>(
      `/integrations/${id}`
    );
    return toIntegration(this.http, inst);
  }

  // ---------------------------------------------------------------------------
  // Global operations (no integration context needed)
  // ---------------------------------------------------------------------------

  async replay(
    actionRunId: string,
    input?: ReplayActionRunInput
  ): Promise<ActionRun> {
    return this.http.post<ActionRun>(
      `/action-runs/${actionRunId}/replay`,
      input ?? {}
    );
  }

  async actionRun(id: string): Promise<ActionRun> {
    return this.http.get<ActionRun>(`/action-runs/${id}`);
  }

  async test(id: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(`/connection-tests/${id}`);
  }

  async diagnostics(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/diagnostics");
  }

  async governance(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/governance/summary");
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export class ProvidersNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ProviderDefinition[]> {
    const res = await this.http.get<{ providers: ProviderDefinition[] }>(
      "/providers"
    );
    return res.providers;
  }

  async get(slug: string): Promise<ProviderDefinition> {
    return this.http.get<ProviderDefinition>(`/providers/${slug}`);
  }
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export class PolicyNamespace {
  constructor(private readonly http: HttpClient) {}

  async simulate(
    requiredScopes: string[],
    providedScopes?: string[]
  ): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>("/policy/simulate", {
      requiredScopes,
      ...(providedScopes ? { providedScopes } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIntegration(
  http: HttpClient,
  inst: InstalledIntegration
): Integration {
  return new Integration(
    http,
    inst.id,
    inst.provider,
    inst.tenantId,
    inst.displayName,
    inst.status,
    inst.config,
    inst.auth,
    inst.version,
    inst.environmentId,
    inst.createdAt,
    inst.updatedAt
  );
}
