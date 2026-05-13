import {
	createPageResult,
	type HttpClient,
	type PageResult,
	type PaginationMeta,
	type PollOptions,
	pollUntil,
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

export class WorkflowsService {
	constructor(private readonly http: HttpClient) {}

	define(name: string): WorkflowBuilder {
		return new WorkflowBuilder(name, this.http);
	}

	use(id: string): WorkflowAccessor {
		return new WorkflowAccessor(id, this.http);
	}

	async list(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.Workflow>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.Workflow>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async create(definition: S.WorkflowDefinition): Promise<S.Workflow> {
		const body = S.WorkflowDefinitionSchema.parse(definition);
		return this.http.post("/workflows", body);
	}

	readonly approvals = new ApprovalsNamespace(this.http);
	readonly steps = new StepsNamespace(this.http);
	readonly templates = new TemplatesNamespace(this.http);
}

export class WorkflowBuilder {
	private _definition: Partial<z.input<typeof S.WorkflowDefinitionSchema>> & {
		name: string;
	};

	constructor(
		name: string,
		private readonly http: HttpClient,
	) {
		this._definition = { name, triggers: [], steps: [], tags: [] };
	}

	description(text: string): this {
		this._definition.description = text;
		return this;
	}
	version(version: string): this {
		this._definition.version = version;
		return this;
	}
	variables(vars: Record<string, unknown>): this {
		this._definition.variables = vars;
		return this;
	}
	tags(...tags: string[]): this {
		this._definition.tags = [...(this._definition.tags ?? []), ...tags];
		return this;
	}

	trigger(trigger: z.input<typeof S.WorkflowTriggerSchema>): this {
		this._definition.triggers = [...(this._definition.triggers ?? []), trigger];
		return this;
	}

	manual(): this {
		this._definition.triggers = [
			...(this._definition.triggers ?? []),
			{ type: "manual" as const },
		];
		return this;
	}

	schedule(cron: string): this {
		this._definition.triggers = [
			...(this._definition.triggers ?? []),
			{ type: "schedule" as const, schedule: cron },
		];
		return this;
	}

	event(eventType: string, config?: Record<string, unknown>): this {
		this._definition.triggers = [
			...(this._definition.triggers ?? []),
			{ type: "event" as const, eventType, config },
		];
		return this;
	}

	webhook(url: string): this {
		this._definition.triggers = [
			...(this._definition.triggers ?? []),
			{ type: "webhook" as const, webhookUrl: url },
		];
		return this;
	}

	step(step: z.input<typeof S.WorkflowStepSchema>): this {
		this._definition.steps = [...(this._definition.steps ?? []), step];
		return this;
	}

	task(
		id: string,
		config: Record<string, unknown> = {},
		opts: {
			name?: string;
			description?: string;
			dependsOn?: string[];
			timeout?: string;
		} = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "task" as const, config, ...opts },
		];
		return this;
	}

	approval(
		id: string,
		approvers: string[],
		opts: {
			name?: string;
			description?: string;
			dependsOn?: string[];
			timeout?: string;
		} = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "approval" as const, config: { approvers }, ...opts },
		];
		return this;
	}

	condition(
		id: string,
		expression: string,
		opts: { name?: string; description?: string; dependsOn?: string[] } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{
				id,
				type: "condition" as const,
				config: { expression },
				condition: expression,
				...opts,
			},
		];
		return this;
	}

	parallel(
		id: string,
		steps: string[],
		opts: { name?: string; description?: string; dependsOn?: string[] } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "parallel" as const, config: { steps }, ...opts },
		];
		return this;
	}

	delay(
		id: string,
		duration: string,
		opts: { name?: string; description?: string; dependsOn?: string[] } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{ id, type: "delay" as const, config: { duration }, ...opts },
		];
		return this;
	}

	notification(
		id: string,
		message: string,
		channels: string[],
		opts: { name?: string; description?: string; dependsOn?: string[] } = {},
	): this {
		this._definition.steps = [
			...(this._definition.steps ?? []),
			{
				id,
				type: "notification" as const,
				config: { message, channels },
				...opts,
			},
		];
		return this;
	}

	async create(): Promise<S.Workflow> {
		const definition = S.WorkflowDefinitionSchema.parse(this._definition);
		return this.http.post("/workflows", definition);
	}

	async activate(): Promise<S.Workflow> {
		const workflow = await this.create();
		return this.http.patch("/workflows", { status: "active" });
	}
}

export class WorkflowAccessor {
	constructor(
		private readonly id: string,
		private readonly http: HttpClient,
	) {}

	async get(): Promise<S.Workflow> {
		return this.http.get("/workflows");
	}

	async update(definition: Partial<S.WorkflowDefinition>): Promise<S.Workflow> {
		return this.http.put("/workflows", definition);
	}

	async delete(): Promise<void> {
		return this.http.delete("/workflows");
	}

	async activate(): Promise<S.Workflow> {
		return this.http.patch("/workflows", { status: "active" });
	}

	async pause(): Promise<S.Workflow> {
		return this.http.patch("/workflows", { status: "paused" });
	}

	async executions(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.WorkflowExecution>> {
		const raw = await this.http.post("/workflows/search", {
			workflowId: this.id,
			...opts,
		});
		return createPageResult(asPagePayload<S.WorkflowExecution>(raw), (cursor) =>
			this.executions({ ...opts, cursor }),
		);
	}

	async execution(executionId: string): Promise<S.WorkflowExecution> {
		return this.http.get("/workflows/" + this.id + "/" + executionId);
	}

	async trigger(
		input: Record<string, unknown> = {},
	): Promise<S.WorkflowExecution> {
		return this.http.post("/workflows/batch", input);
	}

	/**
	 * Polls an execution until it reaches a terminal status.
	 */
	async waitForCompletion(
		executionId: string,
		options?: Pick<
			PollOptions<S.WorkflowExecution>,
			"interval" | "timeout" | "signal"
		>,
	): Promise<S.WorkflowExecution> {
		return pollUntil(() => this.execution(executionId), {
			...options,
			until: (exec) =>
				["completed", "failed", "cancelled"].includes(exec.status),
		});
	}

	/**
	 * Watches an execution via SSE, yielding events as they occur.
	 */
	async *watch(
		executionId: string,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		yield* this.http.stream(
			"/workflows/" + this.id + "/" + executionId + "/timeline",
		);
	}
}

export class ApprovalsNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(
		opts: { status?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.Approval>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.Approval>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async get(id: string): Promise<S.Approval> {
		return this.http.get("/workflows");
	}

	async approve(id: string, comment?: string): Promise<S.Approval> {
		return this.http.post("/workflows/batch", { comment });
	}

	async reject(id: string, comment?: string): Promise<S.Approval> {
		return this.http.post("/workflows/batch", { comment });
	}
}

export class StepsNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(): Promise<S.StepDefinition[]> {
		return this.http.get("/workflows");
	}

	async get(id: string): Promise<S.StepDefinition> {
		return this.http.get("/workflows");
	}

	async create(definition: S.StepDefinition): Promise<S.StepDefinition> {
		const body = S.StepDefinitionSchema.parse(definition);
		return this.http.post("/workflows", body);
	}

	async update(
		id: string,
		definition: Partial<S.StepDefinition>,
	): Promise<S.StepDefinition> {
		return this.http.put("/workflows", definition);
	}

	async delete(id: string): Promise<void> {
		return this.http.delete("/workflows");
	}
}

export class TemplatesNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(
		opts: { category?: string; limit?: number; cursor?: string } = {},
	): Promise<PageResult<S.WorkflowTemplate>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.WorkflowTemplate>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async get(id: string): Promise<S.WorkflowTemplate> {
		return this.http.get("/workflows");
	}

	async create(template: {
		name: string;
		description?: string;
		category?: string;
		definition: S.WorkflowDefinition;
	}): Promise<S.WorkflowTemplate> {
		return this.http.post("/workflows", template);
	}

	async use(id: string, name: string): Promise<S.Workflow> {
		return this.http.post("/workflows/batch", { name });
	}
}
