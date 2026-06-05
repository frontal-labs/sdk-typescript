import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type {
  EvaluationContext,
  Flag,
  FlagEvaluation,
  Rollout,
  TargetingRule,
  Experiment,
} from "./schemas";
import { EvaluationContextSchema, CreateFlagSchema } from "./schemas";

const asPagePayload = <T>(
  raw: unknown
): {
  data: T[];
  pagination: PaginationMeta;
  meta?: unknown;
} =>
  raw as {
    data: T[];
    pagination: PaginationMeta;
    meta?: unknown;
  };

// ── Flags ──────────────────────────────────────────────────────────

export class FlagsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Flag>> {
    const raw = await this.http.get("/v1/flags", opts);
    return createPageResult(asPagePayload<Flag>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(input: {
    key: string;
    name: string;
    description?: string;
    type: string;
    default_value: boolean | string | number;
  }): Promise<Flag> {
    const body = CreateFlagSchema.parse(input);
    return this.http.post("/v1/flags", body);
  }

  async get(id: string): Promise<Flag> {
    return this.http.get(`/v1/flags/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string; default_value?: unknown }
  ): Promise<Flag> {
    return this.http.put(`/v1/flags/${id}`, input);
  }

  async toggle(id: string, enabled: boolean): Promise<Flag> {
    return this.http.post(`/v1/flags/${id}/toggle`, { enabled });
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/v1/flags/${id}`);
  }

  async archive(id: string): Promise<Flag> {
    return this.http.post(`/v1/flags/${id}/archive`, {});
  }
}

// ── Targeting ──────────────────────────────────────────────────────

export class TargetingNamespace {
  constructor(private readonly http: HttpClient) {}

  async listRules(flagId: string): Promise<{ data: TargetingRule[] }> {
    return this.http.get(`/v1/flags/${flagId}/targeting`);
  }

  async createRule(
    flagId: string,
    input: {
      attribute: string;
      operator: string;
      value: unknown;
      priority: number;
    }
  ): Promise<TargetingRule> {
    return this.http.post(`/v1/flags/${flagId}/targeting`, input);
  }

  async updateRule(
    flagId: string,
    ruleId: string,
    input: Partial<TargetingRule>
  ): Promise<TargetingRule> {
    return this.http.put(`/v1/flags/${flagId}/targeting/${ruleId}`, input);
  }

  async deleteRule(flagId: string, ruleId: string): Promise<void> {
    return this.http.delete(`/v1/flags/${flagId}/targeting/${ruleId}`);
  }
}

// ── Rollouts ───────────────────────────────────────────────────────

export class RolloutsNamespace {
  constructor(private readonly http: HttpClient) {}

  async create(
    flagId: string,
    input: { percentage: number; value: unknown }
  ): Promise<Rollout> {
    return this.http.post(`/v1/flags/${flagId}/rollouts`, input);
  }

  async get(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.get(`/v1/flags/${flagId}/rollouts/${rolloutId}`);
  }

  async update(
    flagId: string,
    rolloutId: string,
    input: { percentage?: number; value?: unknown }
  ): Promise<Rollout> {
    return this.http.put(`/v1/flags/${flagId}/rollouts/${rolloutId}`, input);
  }

  async pause(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.post(
      `/v1/flags/${flagId}/rollouts/${rolloutId}/pause`,
      {}
    );
  }

  async resume(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.post(
      `/v1/flags/${flagId}/rollouts/${rolloutId}/resume`,
      {}
    );
  }

  async list(flagId: string): Promise<{ data: Rollout[] }> {
    return this.http.get(`/v1/flags/${flagId}/rollouts`);
  }
}

// ── Experiments ────────────────────────────────────────────────────

export class ExperimentsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { flag_id?: string; status?: string } = {}
  ): Promise<{ data: Experiment[] }> {
    return this.http.get("/v1/flags/experiments", opts);
  }

  async create(input: {
    flag_id: string;
    name: string;
    description?: string;
    variants: Array<{
      name: string;
      value: unknown;
      percentage: number;
    }>;
  }): Promise<Experiment> {
    return this.http.post("/v1/flags/experiments", input);
  }

  async get(id: string): Promise<Experiment> {
    return this.http.get(`/v1/flags/experiments/${id}`);
  }

  async start(id: string): Promise<Experiment> {
    return this.http.post(`/v1/flags/experiments/${id}/start`, {});
  }

  async stop(id: string): Promise<Experiment> {
    return this.http.post(`/v1/flags/experiments/${id}/stop`, {});
  }

  async results(id: string): Promise<{
    variants: Array<{
      name: string;
      value: unknown;
      sample_size: number;
      conversion_rate: number;
    }>;
    confidence: number;
  }> {
    return this.http.get(`/v1/flags/experiments/${id}/results`);
  }
}

// ── Service ────────────────────────────────────────────────────────

export class FlagsService {
  readonly flags: FlagsNamespace;
  readonly targeting: TargetingNamespace;
  readonly rollouts: RolloutsNamespace;
  readonly experiments: ExperimentsNamespace;

  constructor(private readonly http: HttpClient) {
    this.flags = new FlagsNamespace(http);
    this.targeting = new TargetingNamespace(http);
    this.rollouts = new RolloutsNamespace(http);
    this.experiments = new ExperimentsNamespace(http);
  }

  async evaluate(
    flagKey: string,
    context: EvaluationContext
  ): Promise<{ value: boolean | string | number; reason: string }> {
    const body = EvaluationContextSchema.parse(context);
    return this.http.post("/v1/flags/evaluate", {
      flag_key: flagKey,
      context: body,
    });
  }

  async evaluateBulk(
    flags: string[],
    context: EvaluationContext
  ): Promise<Record<string, FlagEvaluation>> {
    const body = EvaluationContextSchema.parse(context);
    return this.http.post("/v1/flags/evaluate/bulk", {
      flags,
      context: body,
    });
  }
}
