import {
  createPageResult,
  type HttpClient,
  type PageResult,
} from "frontal/core";
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

/**
 * Client for the Frontal Integrations API (`/v1/integrations`).
 * Manages provider integrations, action runs, connection tests, capabilities,
 * and surfaces.
 */
export class IntegrationsSdk {
  /** Provider definitions namespace. */
  readonly providers: ProvidersNamespace;
  /** Policy simulation namespace. */
  readonly policy: PolicyNamespace;

  constructor(private readonly http: HttpClient) {
    this.providers = new ProvidersNamespace(http);
    this.policy = new PolicyNamespace(http);
  }

  /**
   * List installed integrations matching the given query.
   * @param query - Filter and pagination options.
   */
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

  /**
   * Install a new integration.
   * @param input - Integration creation payload.
   */
  async create(input: CreateIntegrationInput): Promise<Integration> {
    const inst = await this.http.post<InstalledIntegration>(
      "/integrations",
      input
    );
    return toIntegration(this.http, inst);
  }

  /**
   * Get a single integration by ID.
   * @param id - Integration ID.
   */
  async get(id: string): Promise<Integration> {
    const inst = await this.http.get<InstalledIntegration>(
      `/integrations/${id}`
    );
    return toIntegration(this.http, inst);
  }

  /**
   * Replay an action run.
   * @param actionRunId - ID of the action run to replay.
   * @param input - Optional replay input.
   */
  async replay(
    actionRunId: string,
    input?: ReplayActionRunInput
  ): Promise<ActionRun> {
    return this.http.post<ActionRun>(
      `/action-runs/${actionRunId}/replay`,
      input ?? {}
    );
  }

  /**
   * Get a single action run by ID.
   * @param id - Action run ID.
   */
  async actionRun(id: string): Promise<ActionRun> {
    return this.http.get<ActionRun>(`/action-runs/${id}`);
  }

  /**
   * Get a single connection test by ID.
   * @param id - Connection test ID.
   */
  async test(id: string): Promise<ConnectionTest> {
    return this.http.get<ConnectionTest>(`/connection-tests/${id}`);
  }

  /** Get system diagnostics. */
  async diagnostics(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/diagnostics");
  }

  /** Get governance summary. */
  async governance(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/governance/summary");
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** Namespace for querying available integration providers. */
export class ProvidersNamespace {
  constructor(private readonly http: HttpClient) {}

  /** List all available providers with their capabilities and policies. */
  async list(): Promise<ProviderDefinition[]> {
    const res = await this.http.get<{ providers: ProviderDefinition[] }>(
      "/providers"
    );
    return res.providers;
  }

  /** Get a provider definition by slug. */
  async get(slug: string): Promise<ProviderDefinition> {
    return this.http.get<ProviderDefinition>(`/providers/${slug}`);
  }
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/** Namespace for policy simulation operations. */
export class PolicyNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Simulate a policy evaluation with the given scopes.
   * @param requiredScopes - The scopes required by the policy.
   * @param providedScopes - The scopes provided by the caller.
   */
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
