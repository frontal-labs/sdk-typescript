import {
	createPageResult,
	type HttpClient,
	type PageResult,
	type PaginationMeta,
} from "@frontal/core";
import type { z } from "zod";
import * as S from "./schemas";

const asPagePayload = <T>(
	raw: unknown,
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
		const raw = await this.http.get("/ontology/engine/runs", opts);
		return createPageResult(asPagePayload<S.Model>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async create(definition: S.ModelDefinition): Promise<S.Model> {
		const body = S.ModelDefinitionSchema.parse(definition);
		return this.http.post("/ontology/engine/runs", body);
	}

	async validate(
		definition: S.ModelDefinition,
	): Promise<{ valid: boolean; errors?: unknown[]; warnings?: unknown[] }> {
		const body = S.ModelDefinitionSchema.parse(definition);
		return this.http.post("/ontology/engine/ontologies/validate", body);
	}

	async checkIntegrity(): Promise<{ valid: boolean; violations?: unknown[] }> {
		return this.http.get("/ontology/engine/health");
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
		return this.http.get("/ontology/engine/runs", params);
	}

	async update(definition: Partial<S.ModelDefinition>): Promise<S.Model> {
		return this.http.post("/ontology/engine/runs", definition);
	}

	async delete(force = false): Promise<void> {
		return this.http.post("/ontology/engine/runs", {
			action: "delete-model",
			force,
		});
	}

	async relationships(): Promise<{ data: S.RelationshipDefinition[] }> {
		return this.http.get("/ontology/engine/runs");
	}

	async addRelationship(
		definition: S.RelationshipDefinition,
	): Promise<S.RelationshipDefinition> {
		const body = S.RelationshipDefinitionSchema.parse(definition);
		return this.http.post("/ontology/engine/runs", body);
	}

	async removeRelationship(relationshipId: string): Promise<void> {
		return this.http.post("/ontology/engine/runs", {
			action: "delete-relationship",
			relationshipId,
		});
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
		return this.http.get("/ontology/engine/runs");
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
			request,
		);
	}

	async apply(
		planId: string,
		strategy = "zero-downtime",
	): Promise<{ id: string; status: string; appliedAt: string }> {
		return this.http.post("/ontology/engine/runs", { planId, strategy });
	}

	async rollback(
		migrationId: string,
	): Promise<{ id: string; status: string; rolledBackAt: string }> {
		return this.http.post("/ontology/engine/runs");
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
		const raw = await this.http.get("/ontology/engine/runs", opts);
		return createPageResult(
			asPagePayload<{
				id: string;
				modelId: string;
				fromVersion: number;
				toVersion: number;
				status: string;
				createdAt: string;
			}>(raw),
			(cursor) => this.history({ ...opts, cursor }),
		);
	}
}

export class RulesNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(): Promise<{ data: S.RuleDefinition[] }> {
		return this.http.get("/ontology/engine/runs");
	}

	async create(definition: S.RuleDefinition): Promise<S.RuleDefinition> {
		const body = S.RuleDefinitionSchema.parse(definition);
		return this.http.post("/ontology/engine/runs", body);
	}

	async update(
		ruleId: string,
		definition: Partial<S.RuleDefinition>,
	): Promise<S.RuleDefinition> {
		return this.http.post("/ontology/engine/runs", definition);
	}

	async delete(ruleId: string): Promise<void> {
		return this.http.post("/ontology/engine/runs", {
			action: "delete-rule",
			ruleId,
		});
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
		return this.http.get("/ontology/engine/runs");
	}

	async create(definition: S.MixinDefinition): Promise<S.MixinDefinition> {
		const body = S.MixinDefinitionSchema.parse(definition);
		return this.http.post("/ontology/engine/runs", body);
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
		opts: { status?: "pending" | "accepted" | "rejected" } = {},
	): Promise<{ data: unknown[] }> {
		return this.http.get("/ontology/engine/runs", opts);
	}

	async acceptSuggestion(suggestionId: string): Promise<unknown> {
		return this.http.post("/ontology/engine/runs");
	}

	async rejectSuggestion(
		suggestionId: string,
		reason?: string,
	): Promise<unknown> {
		return this.http.post("/ontology/engine/runs", {
			reason,
		});
	}
}
