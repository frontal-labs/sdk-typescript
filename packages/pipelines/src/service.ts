import {
	createPageResult,
	type HttpClient,
	type PageResult,
	type PollOptions,
	pollUntil,
} from "@frontal/core";
import type { z } from "zod";
import * as S from "./schemas";

export class PipelinesService {
	readonly lineage = new LineageNamespace(this.http);
	constructor(private readonly http: HttpClient) {}

	define(name: string): PipelineBuilder {
		return new PipelineBuilder(name, this.http);
	}

	use(id: string): PipelineAccessor {
		return new PipelineAccessor(id, this.http);
	}

	async list(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.Pipeline>> {
		const raw = await this.http.get("/pipelines", opts);
		return createPageResult(raw as any, (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async create(definition: S.PipelineDefinition): Promise<S.Pipeline> {
		const body = S.PipelineDefinitionSchema.parse(definition);
		return this.http.post("/pipelines", body, S.PipelineSchema);
	}
}

export class PipelineBuilder {
	private _definition: Partial<z.input<typeof S.PipelineDefinitionSchema>> & {
		name: string;
	};

	constructor(
		name: string,
		private readonly http: HttpClient,
	) {
		this._definition = { name, steps: [], tags: [] };
	}

	description(text: string): this {
		this._definition.description = text;
		return this;
	}
	schedule(cron: string): this {
		this._definition.schedule = cron;
		return this;
	}
	timeout(duration: string): this {
		this._definition.timeout = duration;
		return this;
	}
	retryPolicy(policy: "linear" | "exponential" | "none"): this {
		this._definition.retryPolicy = policy;
		return this;
	}
	errorHandling(strategy: "fail" | "skip" | "retry"): this {
		this._definition.errorHandling = strategy;
		return this;
	}
	tags(...tags: string[]): this {
		this._definition.tags = [...(this._definition.tags ?? []), ...tags];
		return this;
	}

	source(source: z.input<typeof S.PipelineSourceSchema>): this {
		this._definition.source = source;
		return this;
	}

	fromGraph(entityType: string, filter?: Record<string, unknown>): this {
		this._definition.source = { type: "graph-entity", entityType, filter };
		return this;
	}

	fromWebhook(url: string, config?: Record<string, unknown>): this {
		this._definition.source = { type: "webhook", config: { url, ...config } };
		return this;
	}

	fromSchedule(cron: string): this {
		this._definition.source = { type: "schedule", cron };
		return this;
	}

	fromManual(): this {
		this._definition.source = { type: "manual" };
		return this;
	}

	// Pipeline steps
	collect(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "collect", config, ...opts },
		];
		return this;
	}

	transform(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "transform", config, ...opts },
		];
		return this;
	}

	enrich(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "enrich", config, ...opts },
		];
		return this;
	}

	validate(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "validate", config, ...opts },
		];
		return this;
	}

	write(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "write", config, ...opts },
		];
		return this;
	}

	notify(
		id: string,
		config: Record<string, unknown> = {},
		opts: { next?: string; condition?: string; timeout?: string } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "notify", config, ...opts },
		];
		return this;
	}

	async create(): Promise<S.Pipeline> {
		const definition = S.PipelineDefinitionSchema.parse(this._definition);
		return this.http.post("/pipelines", definition, S.PipelineSchema);
	}

	async activate(): Promise<S.Pipeline> {
		const pipeline = await this.create();
		return this.http.patch(
			`/pipelines/${pipeline.id}`,
			{ status: "active" },
			S.PipelineSchema,
		);
	}
}

export class PipelineAccessor {
	constructor(
		private readonly id: string,
		private readonly http: HttpClient,
	) {}

	async get(): Promise<S.Pipeline> {
		return this.http.get(`/pipelines/${this.id}`, undefined, S.PipelineSchema);
	}

	async update(definition: Partial<S.PipelineDefinition>): Promise<S.Pipeline> {
		return this.http.put(`/pipelines/${this.id}`, definition, S.PipelineSchema);
	}

	async delete(): Promise<void> {
		return this.http.delete(`/pipelines/${this.id}`);
	}

	async runs(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.PipelineRun>> {
		const raw = await this.http.get(`/pipelines/${this.id}/runs`, opts);
		return createPageResult(raw as any, (cursor) =>
			this.runs({ ...opts, cursor }),
		);
	}

	async run(runId: string): Promise<S.PipelineRun> {
		return this.http.get(
			`/pipelines/${this.id}/runs/${runId}`,
			undefined,
			S.PipelineRunSchema,
		);
	}

	async trigger(input: Record<string, unknown> = {}): Promise<S.PipelineRun> {
		return this.http.post(
			`/pipelines/${this.id}/execute`,
			input,
			S.PipelineRunSchema,
		);
	}

	async backfills(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.Backfill>> {
		const raw = await this.http.get(`/pipelines/${this.id}/backfills`, opts);
		return createPageResult(raw as any, (cursor) =>
			this.backfills({ ...opts, cursor }),
		);
	}

	async backfill(
		from: string,
		to: string,
		opts: { strategy?: "full" | "incremental"; dryRun?: boolean } = {},
	): Promise<S.Backfill> {
		return this.http.post(
			`/pipelines/${this.id}/backfills`,
			{ from, to, ...opts },
			S.BackfillSchema,
		);
	}

	async health(): Promise<S.PipelineHealth> {
		return this.http.get(
			`/pipelines/${this.id}/health`,
			undefined,
			S.PipelineHealthSchema,
		);
	}

	/**
	 * Polls a pipeline run until it reaches a terminal status.
	 */
	async waitForRun(
		runId: string,
		options?: Pick<
			PollOptions<S.PipelineRun>,
			"interval" | "timeout" | "signal"
		>,
	): Promise<S.PipelineRun> {
		return pollUntil(() => this.run(runId), {
			...options,
			until: (run) => ["completed", "failed", "cancelled"].includes(run.status),
		});
	}

	/**
	 * Watches a pipeline run via SSE, yielding events as they occur.
	 */
	async *watchRun(
		runId: string,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		yield* this.http.stream(`/pipelines/${this.id}/runs/${runId}/events`);
	}
}

export class LineageNamespace {
	constructor(private readonly http: HttpClient) {}

	async graph(
		opts: {
			pipelineIds?: string[];
			entityType?: string;
			from?: string;
			to?: string;
		} = {},
	): Promise<S.LineageGraph> {
		return this.http.get("/pipelines/lineage", opts, S.LineageGraphSchema);
	}

	async upstream(
		entityType: string,
		entityId: string,
	): Promise<{ pipelines: S.Pipeline[]; entities: any[] }> {
		return this.http.get(
			`/pipelines/lineage/upstream/${entityType}/${entityId}`,
		);
	}

	async downstream(
		entityType: string,
		entityId: string,
	): Promise<{ pipelines: S.Pipeline[]; entities: any[] }> {
		return this.http.get(
			`/pipelines/lineage/downstream/${entityType}/${entityId}`,
		);
	}
}
