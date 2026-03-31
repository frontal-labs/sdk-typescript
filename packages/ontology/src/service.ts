import {
	createPageResult,
	type HttpClient,
	type PageResult,
} from "@frontal/core";
import type { z } from "zod";
import * as S from "./schemas";

export class OntologyService {
	constructor(private readonly http: HttpClient) {}

	use(name: string): ModelAccessor {
		return new ModelAccessor(name, this.http);
	}

	async list(
		opts: {
			status?: z.infer<typeof S.ModelSchema>["status"];
			substrate?: string;
			limit?: number;
			cursor?: string;
		} = {},
	): Promise<PageResult<S.Model>> {
		const raw = await this.http.get("/ontology", opts);
		return createPageResult(raw as any, (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async create(definition: S.ModelDefinition): Promise<S.Model> {
		const body = S.ModelDefinitionSchema.parse(definition);
		return this.http.post("/ontology", body, S.ModelSchema);
	}

	async validate(
		definition: S.ModelDefinition,
	): Promise<{ valid: boolean; errors?: any[]; warnings?: any[] }> {
		const body = S.ModelDefinitionSchema.parse(definition);
		return this.http.post("/ontology/validate", body);
	}

	async checkIntegrity(): Promise<{ valid: boolean; violations?: any[] }> {
		return this.http.get("/ontology/integrity");
	}

	readonly migrations = new MigrationsNamespace(this.http);
	readonly rules = new RulesNamespace(this.http);
	readonly mixins = new MixinsNamespace(this.http);
	readonly generation = new GenerationNamespace(this.http);
}

export class ModelAccessor {
	constructor(
		private readonly name: string,
		private readonly http: HttpClient,
	) {}

	async get(version?: number): Promise<S.Model> {
		const params = version ? { version } : undefined;
		return this.http.get(`/models/${this.name}`, params, S.ModelSchema);
	}

	async update(definition: Partial<S.ModelDefinition>): Promise<S.Model> {
		return this.http.put(`/models/${this.name}`, definition, S.ModelSchema);
	}

	async delete(force = false): Promise<void> {
		return this.http.delete(`/models/${this.name}`, { force });
	}

	async relationships(): Promise<{ data: S.RelationshipDefinition[] }> {
		return this.http.get(`/models/${this.name}/relationships`);
	}

	async addRelationship(
		definition: S.RelationshipDefinition,
	): Promise<S.RelationshipDefinition> {
		const body = S.RelationshipDefinitionSchema.parse(definition);
		return this.http.post(`/models/${this.name}/relationships`, body);
	}

	async removeRelationship(relationshipId: string): Promise<void> {
		return this.http.delete(
			`/models/${this.name}/relationships/${relationshipId}`,
		);
	}

	async validateData(): Promise<{
		entityType: string;
		totalChecked: number;
		violations: any[];
	}> {
		return this.http.post(`/models/${this.name}/validate-data`);
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
		return this.http.get(`/models/${this.name}/versions`);
	}
}

export class MigrationsNamespace {
	constructor(private readonly http: HttpClient) {}

	async plan(request: {
		modelId?: string;
		changes?: S.ModelDefinition[];
	}): Promise<S.MigrationPlan> {
		return this.http.post(
			"/ontology/migrations/plan",
			request,
			S.MigrationPlanSchema,
		);
	}

	async apply(
		planId: string,
		strategy = "zero-downtime",
	): Promise<{ id: string; status: string; appliedAt: string }> {
		return this.http.post("/ontology/migrations/apply", { planId, strategy });
	}

	async rollback(
		migrationId: string,
	): Promise<{ id: string; status: string; rolledBackAt: string }> {
		return this.http.post(`/ontology/migrations/${migrationId}/rollback`);
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
		const raw = await this.http.get("/ontology/migrations/history", opts);
		return createPageResult(raw as any, (cursor) =>
			this.history({ ...opts, cursor }),
		);
	}
}

export class RulesNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(): Promise<{ data: S.RuleDefinition[] }> {
		return this.http.get("/ontology/rules");
	}

	async create(definition: S.RuleDefinition): Promise<S.RuleDefinition> {
		const body = S.RuleDefinitionSchema.parse(definition);
		return this.http.post("/ontology/rules", body);
	}

	async update(
		ruleId: string,
		definition: Partial<S.RuleDefinition>,
	): Promise<S.RuleDefinition> {
		return this.http.put(`/ontology/rules/${ruleId}`, definition);
	}

	async delete(ruleId: string): Promise<void> {
		return this.http.delete(`/ontology/rules/${ruleId}`);
	}

	async evaluate(opts: {
		entityType?: string;
		ruleIds?: string[];
		sample?: number;
	}): Promise<{ results: any[]; summary: any }> {
		return this.http.post("/ontology/rules/evaluate", opts);
	}
}

export class MixinsNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(): Promise<{ data: S.MixinDefinition[] }> {
		return this.http.get("/ontology/mixins");
	}

	async create(definition: S.MixinDefinition): Promise<S.MixinDefinition> {
		const body = S.MixinDefinitionSchema.parse(definition);
		return this.http.post("/ontology/mixins", body);
	}
}

export class GenerationNamespace {
	constructor(private readonly http: HttpClient) {}

	async generate(
		description: string,
		opts: { context?: { existingModels?: string[] }; substrates?: string[] },
	): Promise<{
		proposal: S.ModelDefinition;
		confidence: number;
		reasoning: string;
	}> {
		return this.http.post("/ontology/generate", { description, ...opts });
	}

	async infer(opts: {
		substrates?: string[];
		confidence?: "low" | "medium" | "high";
		merge?: boolean;
	}): Promise<{ proposals: any[] }> {
		return this.http.post("/ontology/infer", opts);
	}

	async suggestions(
		opts: { status?: "pending" | "accepted" | "rejected" } = {},
	): Promise<{ data: any[] }> {
		return this.http.get("/ontology/suggestions", opts);
	}

	async acceptSuggestion(suggestionId: string): Promise<any> {
		return this.http.post(`/ontology/suggestions/${suggestionId}/accept`);
	}

	async rejectSuggestion(
		suggestionId: string,
		reason?: string,
	): Promise<unknown> {
		return this.http.post(`/ontology/suggestions/${suggestionId}/reject`, {
			reason,
		});
	}
}
