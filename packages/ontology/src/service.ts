import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
} from "@frontal-labs/core";
import type { z } from "zod";
import * as S from "./schemas";

export class OntologyService {
  readonly migrations: MigrationsNamespace;
  readonly rules: RulesNamespace;
  readonly mixins: MixinsNamespace;
  readonly generation: GenerationNamespace;

  constructor(private readonly http: HttpClient) {
    this.migrations = new MigrationsNamespace(http);
    this.rules = new RulesNamespace(http);
    this.mixins = new MixinsNamespace(http);
    this.generation = new GenerationNamespace(http);
  }

  use(name: string): ModelAccessor {
    return new ModelAccessor(name, this.http);
  }

  async list(
    opts: {
      status?: z.infer<typeof S.ModelSchema>["status"];
      substrate?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<S.Model>> {
    const raw = await this.http.get("/ontology/engine/ontologies", opts);
    return createPageResult(asPagePayload<S.Model>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(definition: S.ModelDefinition): Promise<S.Model> {
    const body = S.ModelDefinitionSchema.parse(definition);
    return this.http.post("/ontology/engine/ontologies", body);
  }

  async validate(
    definition: S.ModelDefinition
  ): Promise<{ valid: boolean; errors?: unknown[]; warnings?: unknown[] }> {
    const body = S.ModelDefinitionSchema.parse(definition);
    return this.http.post("/ontology/engine/ontologies/validate", body);
  }

  async checkIntegrity(): Promise<{ valid: boolean; violations?: unknown[] }> {
    return this.http.get("/ontology/engine/health");
  }
}

export class ModelAccessor {
  constructor(
    readonly _name: string,
    private readonly http: HttpClient
  ) {}

  async get(version?: number): Promise<S.Model> {
    const params = version ? { version } : undefined;
    return this.http.get(`/ontology/engine/ontologies/${this._name}`, params);
  }

  async update(definition: Partial<S.ModelDefinition>): Promise<S.Model> {
    return this.http.put(
      `/ontology/engine/ontologies/${this._name}`,
      definition
    );
  }

  async delete(force = false): Promise<void> {
    return this.http.delete(`/ontology/engine/ontologies/${this._name}`, {
      force,
    });
  }

  async relationships(): Promise<{ data: S.RelationshipDefinition[] }> {
    return this.http.get("/ontology/relationships/relationships");
  }

  async addRelationship(
    definition: S.RelationshipDefinition
  ): Promise<S.RelationshipDefinition> {
    const body = S.RelationshipDefinitionSchema.parse(definition);
    return this.http.post("/ontology/relationships/relationships", body);
  }

  async removeRelationship(relationshipId: string): Promise<void> {
    return this.http.delete(
      `/ontology/relationships/relationships/${relationshipId}`
    );
  }

  async validateData(): Promise<{
    entityType: string;
    totalChecked: number;
    violations: unknown[];
  }> {
    return this.http.post("/ontology/engine/ontologies/validate");
  }

  async versions(): Promise<{
    data: Array<{
      version: number;
      createdAt: string;
      changedBy: string;
      changesSummary: string;
      migrationId?: string;
    }>;
  }> {
    return this.http.get("/ontology/versions/versions", {
      modelId: this._name,
    });
  }
}

export class MigrationsNamespace {
  constructor(private readonly http: HttpClient) {}

  async plan(request: {
    modelId?: string;
    changes?: S.ModelDefinition[];
  }): Promise<S.MigrationPlan> {
    return this.http.post(
      "/ontology/engine/ontologies/compare-versions",
      request
    );
  }

  async apply(
    planId: string,
    strategy = "zero-downtime"
  ): Promise<{ id: string; status: string; appliedAt: string }> {
    return this.http.post("/ontology/engine/migrations/apply", {
      planId,
      strategy,
    });
  }

  async rollback(
    _migrationId: string
  ): Promise<{ id: string; status: string; rolledBackAt: string }> {
    return this.http.post("/ontology/engine/migrations/rollback");
  }

  async history(opts: { limit?: number; cursor?: string } = {}): Promise<
    PageResult<{
      id: string;
      modelId: string;
      fromVersion: number;
      toVersion: number;
      status: string;
      createdAt: string;
    }>
  > {
    const raw = await this.http.get("/ontology/engine/migrations", opts);
    return createPageResult(
      asPagePayload<{
        id: string;
        modelId: string;
        fromVersion: number;
        toVersion: number;
        status: string;
        createdAt: string;
      }>(raw),
      (cursor) => this.history({ ...opts, cursor })
    );
  }
}

export class RulesNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: S.RuleDefinition[] }> {
    return this.http.get("/ontology/reasoning/rules");
  }

  async create(definition: S.RuleDefinition): Promise<S.RuleDefinition> {
    const body = S.RuleDefinitionSchema.parse(definition);
    return this.http.post("/ontology/reasoning/rules", body);
  }

  async update(
    _ruleId: string,
    definition: Partial<S.RuleDefinition>
  ): Promise<S.RuleDefinition> {
    return this.http.put(`/ontology/reasoning/rules/${_ruleId}`, definition);
  }

  async delete(ruleId: string): Promise<void> {
    return this.http.delete(`/ontology/reasoning/rules/${ruleId}`);
  }

  async evaluate(opts: {
    entityType?: string;
    ruleIds?: string[];
    sample?: number;
  }): Promise<{ results: unknown[]; summary: unknown }> {
    return this.http.post("/ontology/engine/ontologies/validate", opts);
  }
}

export class MixinsNamespace {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<{ data: S.MixinDefinition[] }> {
    return this.http.get("/ontology/schemas/schemas");
  }

  async create(definition: S.MixinDefinition): Promise<S.MixinDefinition> {
    const body = S.MixinDefinitionSchema.parse(definition);
    return this.http.post("/ontology/schemas/schemas", body);
  }
}

export class GenerationNamespace {
  constructor(private readonly http: HttpClient) {}

  async generate(
    description: string,
    opts: { context?: { existingModels?: string[] }; substrates?: string[] }
  ): Promise<{
    proposal: S.ModelDefinition;
    confidence: number;
    reasoning: string;
  }> {
    return this.http.post("/ontology/engine/ontologies/generate", {
      description,
      ...opts,
    });
  }

  async infer(opts: {
    substrates?: string[];
    confidence?: "low" | "medium" | "high";
    merge?: boolean;
  }): Promise<{ proposals: unknown[] }> {
    return this.http.post("/ontology/engine/ontologies/infer-classes", opts);
  }

  async suggestions(
    opts: { status?: "pending" | "accepted" | "rejected" } = {}
  ): Promise<{ data: unknown[] }> {
    return this.http.get("/ontology/engine/suggestions", opts);
  }

  async acceptSuggestion(_suggestionId: string): Promise<unknown> {
    return this.http.post(
      `/ontology/engine/suggestions/${_suggestionId}/accept`
    );
  }

  async rejectSuggestion(
    _suggestionId: string,
    reason?: string
  ): Promise<unknown> {
    return this.http.post(
      `/ontology/engine/suggestions/${_suggestionId}/reject`,
      {
        reason,
      }
    );
  }
}
