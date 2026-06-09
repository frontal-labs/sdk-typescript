import {
  asPagePayload,
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

export class FlagsService {
  readonly targeting: TargetingNamespace;
  readonly rollouts: RolloutsNamespace;
  readonly experiments: ExperimentsNamespace;

  constructor(private readonly http: HttpClient) {
    this.targeting = new TargetingNamespace(http);
    this.rollouts = new RolloutsNamespace(http);
    this.experiments = new ExperimentsNamespace(http);
  }

  async list(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<Flag>> {
    const raw = await this.http.get("/flags", opts);
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
    return this.http.post("/flags", body);
  }

  async get(id: string): Promise<Flag> {
    return this.http.get(`/flags/${id}`);
  }

  async update(
    id: string,
    input: { name?: string; description?: string; default_value?: unknown }
  ): Promise<Flag> {
    return this.http.put(`/flags/${id}`, input);
  }

  async toggle(id: string, enabled: boolean): Promise<Flag> {
    return this.http.post(`/flags/${id}/toggle`, { enabled });
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/flags/${id}`);
  }

  async archive(id: string): Promise<Flag> {
    return this.http.post(`/flags/${id}/archive`, {});
  }

  async evaluate(
    flagKey: string,
    context: EvaluationContext
  ): Promise<{ value: boolean | string | number; reason: string }> {
    const body = EvaluationContextSchema.parse(context);
    return this.http.post("/flags/evaluate", {
      flag_key: flagKey,
      context: body,
    });
  }

  async evaluateBulk(
    flags: string[],
    context: EvaluationContext
  ): Promise<Record<string, FlagEvaluation>> {
    const body = EvaluationContextSchema.parse(context);
    return this.http.post("/flags/evaluate/bulk", {
      flags,
      context: body,
    });
  }
}

export class TargetingNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(flagId: string): Promise<{ data: TargetingRule[] }> {
    return this.http.get(`/flags/${flagId}/targeting`);
  }

  async create(
    flagId: string,
    input: {
      attribute: string;
      operator: string;
      value: unknown;
      priority: number;
    }
  ): Promise<TargetingRule> {
    return this.http.post(`/flags/${flagId}/targeting`, input);
  }

  async update(
    flagId: string,
    ruleId: string,
    input: Partial<TargetingRule>
  ): Promise<TargetingRule> {
    return this.http.put(`/flags/${flagId}/targeting/${ruleId}`, input);
  }

  async delete(flagId: string, ruleId: string): Promise<void> {
    return this.http.delete(`/flags/${flagId}/targeting/${ruleId}`);
  }
}

export class RolloutsNamespace {
  constructor(private readonly http: HttpClient) {}

  async create(
    flagId: string,
    input: { percentage: number; value: unknown }
  ): Promise<Rollout> {
    return this.http.post(`/flags/${flagId}/rollouts`, input);
  }

  async get(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.get(`/flags/${flagId}/rollouts/${rolloutId}`);
  }

  async update(
    flagId: string,
    rolloutId: string,
    input: { percentage?: number; value?: unknown }
  ): Promise<Rollout> {
    return this.http.put(`/flags/${flagId}/rollouts/${rolloutId}`, input);
  }

  async pause(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.post(`/flags/${flagId}/rollouts/${rolloutId}/pause`, {});
  }

  async resume(flagId: string, rolloutId: string): Promise<Rollout> {
    return this.http.post(`/flags/${flagId}/rollouts/${rolloutId}/resume`, {});
  }

  async list(flagId: string): Promise<{ data: Rollout[] }> {
    return this.http.get(`/flags/${flagId}/rollouts`);
  }
}

export class ExperimentsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(
    opts: { flag_id?: string; status?: string } = {}
  ): Promise<{ data: Experiment[] }> {
    return this.http.get("/flags/experiments", opts);
  }

  async create(input: {
    flag_id: string;
    name: string;
    description?: string;
    variants: {
      name: string;
      value: unknown;
      percentage: number;
    }[];
  }): Promise<Experiment> {
    return this.http.post("/flags/experiments", input);
  }

  async get(id: string): Promise<Experiment> {
    return this.http.get(`/flags/experiments/${id}`);
  }

  async start(id: string): Promise<Experiment> {
    return this.http.post(`/flags/experiments/${id}/start`, {});
  }

  async stop(id: string): Promise<Experiment> {
    return this.http.post(`/flags/experiments/${id}/stop`, {});
  }

  async results(id: string): Promise<{
    variants: {
      name: string;
      value: unknown;
      sample_size: number;
      conversion_rate: number;
    }[];
    confidence: number;
  }> {
    return this.http.get(`/flags/experiments/${id}/results`);
  }
}
