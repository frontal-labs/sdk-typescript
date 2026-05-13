import {
	createPageResult,
	type HttpClient,
	type PageResult,
	type PollOptions,
	pollUntil,
} from "@frontal/core";
import type { z } from "zod";
import type { AgentHandler } from "./context";
import * as S from "./schemas";

const asPagePayload = <T>(raw: unknown) =>
	raw as {
		data: T[];
		pagination: {
			cursor: string;
			hasMore: boolean;
			total?: number;
			limit?: number;
			offset?: number;
		};
		meta?: unknown;
	};

export class AgentsService {
	constructor(private readonly http: HttpClient) {}

	define(name: string): AgentBuilder {
		return new AgentBuilder(name, this.http);
	}

	use(id: string): AgentAccessor {
		return new AgentAccessor(id, this.http);
	}

	async list(
		opts: {
			status?: z.infer<typeof S.AgentStatusSchema>;
			trigger?: string;
			limit?: number;
			cursor?: string;
		} = {},
	): Promise<PageResult<S.Agent>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.Agent>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async create(definition: S.AgentDefinition): Promise<S.Agent> {
		const body = S.AgentDefinitionSchema.parse(definition);
		return this.http.post("/workflows", body);
	}

	readonly escalations = new EscalationsNamespace(this.http);
}

export class AgentBuilder {
	private _definition: Partial<z.input<typeof S.AgentDefinitionSchema>> & {
		name: string;
	};
	private _handlers: Map<string, AgentHandler> = new Map();

	constructor(
		name: string,
		private readonly http: HttpClient,
	) {
		this._definition = {
			name,
			triggers: [],
			tags: [],
		};
	}

	description(text: string): this {
		this._definition.description = text;
		return this;
	}

	trigger(event: string, filter?: Record<string, unknown>): this {
		this._definition.triggers = [
			...(this._definition.triggers ?? []),
			{ event, filter },
		];
		return this;
	}

	scope(scope: z.input<typeof S.AgentScopeSchema>): this {
		this._definition.scope = scope;
		return this;
	}

	canRead(...entityTypes: string[]): this {
		this._definition.scope = {
			...this._definition.scope,
			read: [...(this._definition.scope?.read ?? []), ...entityTypes],
		};
		return this;
	}

	canWrite(...entityTypes: string[]): this {
		this._definition.scope = {
			...this._definition.scope,
			write: [...(this._definition.scope?.write ?? []), ...entityTypes],
		};
		return this;
	}

	canInvoke(...actions: string[]): this {
		this._definition.scope = {
			...this._definition.scope,
			actions: [...(this._definition.scope?.actions ?? []), ...actions],
		};
		return this;
	}

	escalatesOn(...conditions: string[]): this {
		this._definition.scope = {
			...this._definition.scope,
			escalate: [...(this._definition.scope?.escalate ?? []), ...conditions],
		};
		return this;
	}

	confidence(config: z.input<typeof S.ConfidenceConfigSchema>): this {
		this._definition.confidence = config;
		return this;
	}

	autoExecuteAbove(threshold: number): this {
		this._definition.confidence = {
			...this._definition.confidence,
			autoExecuteAbove: threshold,
		};
		return this;
	}

	escalateBelow(threshold: number): this {
		this._definition.confidence = {
			...this._definition.confidence,
			escalateBelow: threshold,
		};
		return this;
	}

	memory(config: z.input<typeof S.MemoryConfigSchema>): this {
		this._definition.memory = config;
		return this;
	}

	retry(config: z.input<typeof S.retryConfigSchema>): this {
		this._definition.retry = config;
		return this;
	}

	timeout(duration: string): this {
		this._definition.timeout = duration;
		return this;
	}

	rateLimit(config: z.input<typeof S.RateLimitConfigSchema>): this {
		this._definition.rateLimit = config;
		return this;
	}

	tags(...tags: string[]): this {
		this._definition.tags = [...(this._definition.tags ?? []), ...tags];
		return this;
	}

	// Register behavior handler
	on(event: string, handler: AgentHandler): this {
		this._handlers.set(event, handler);
		return this;
	}

	async create(): Promise<S.Agent> {
		const definition = S.AgentDefinitionSchema.parse(this._definition);
		const agent = await this.http.post("/workflows", definition);
		return agent;
	}

	async deploy(environment = "production"): Promise<S.Agent> {
		const agent = await this.create();
		await this.http.post("/workflows/batch", { environment });
		return agent;
	}
}

export class AgentAccessor {
	constructor(
		private readonly id: string,
		private readonly http: HttpClient,
	) {}

	async get(): Promise<S.Agent> {
		return this.http.get("/workflows");
	}

	async update(definition: Partial<S.AgentDefinition>): Promise<S.Agent> {
		return this.http.put("/workflows", definition);
	}

	async delete(): Promise<void> {
		return this.http.delete("/workflows");
	}

	async deploy(
		environment = "production",
		opts: { version?: number; runSimulationFirst?: boolean } = {},
	): Promise<S.Deployment> {
		return this.http.post("/workflows/batch", {
			environment,
			...opts,
		});
	}

	async pause(
		opts: { reason?: string; drainInFlight?: boolean } = {},
	): Promise<S.Agent> {
		return this.http.post("/workflows/batch", opts);
	}

	async resume(): Promise<S.Agent> {
		return this.http.post("/workflows/batch");
	}

	async rollback(opts: { toVersion?: number } = {}): Promise<S.Agent> {
		return this.http.post("/workflows/batch", opts);
	}

	async simulate(
		event: string,
		payload: Record<string, unknown>,
		opts: { graphSnapshot?: string; version?: number } = {},
	): Promise<S.SimulationResult> {
		return this.http.post("/workflows/batch", {
			event,
			payload,
			...opts,
		});
	}

	async executions(
		opts: {
			status?: string;
			from?: string;
			to?: string;
			limit?: number;
			cursor?: string;
		} = {},
	): Promise<PageResult<S.Execution>> {
		const raw = await this.http.post("/workflows/search", {
			agentId: this.id,
			...opts,
		});
		return createPageResult(asPagePayload<S.Execution>(raw), (cursor) =>
			this.executions({ ...opts, cursor }),
		);
	}

	async execution(executionId: string): Promise<S.Execution> {
		return this.http.get(`/workflows/${this.id}/${executionId}`);
	}

	async escalations(
		opts: {
			status?: string;
			urgency?: string;
			limit?: number;
			cursor?: string;
		} = {},
	): Promise<PageResult<S.Escalation>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.Escalation>(raw), (cursor) =>
			this.escalations({ ...opts, cursor }),
		);
	}

	async metrics(period = "7d"): Promise<AgentMetrics> {
		return this.http.get("/workflows", { period });
	}

	async message(
		event: string,
		payload: Record<string, unknown>,
		opts: { waitForCompletion?: boolean; timeout?: number } = {},
	): Promise<{ messageId: string; executionId: string; status: string }> {
		return this.http.post("/workflows/batch", {
			event,
			payload,
			...opts,
		});
	}

	readonly experiments = new ExperimentsAccessor(this.id, this.http);

	/**
	 * Polls an execution until it reaches a terminal status.
	 * @param executionId - The execution to wait for.
	 * @param options - Polling options (interval, timeout, signal).
	 * @returns The completed execution.
	 * @throws TimeoutError if the timeout is exceeded.
	 */
	async waitForCompletion(
		executionId: string,
		options?: Pick<PollOptions<S.Execution>, "interval" | "timeout" | "signal">,
	): Promise<S.Execution> {
		return pollUntil(() => this.execution(executionId), {
			...options,
			until: (exec) =>
				["completed", "failed", "escalated"].includes(exec.status),
		});
	}

	/**
	 * Watches an execution via SSE, yielding events as they occur.
	 * @param executionId - The execution to watch.
	 * @returns AsyncIterable of SSE events.
	 */
	async *watch(
		executionId: string,
	): AsyncIterable<{ type: string; data: unknown; id?: string }> {
		yield* this.http.stream(`/workflows/${this.id}/${executionId}/timeline`);
	}
}

export class EscalationsNamespace {
	constructor(private readonly http: HttpClient) {}

	async list(
		opts: {
			status?: string;
			urgency?: string;
			limit?: number;
			cursor?: string;
		} = {},
	): Promise<PageResult<S.Escalation>> {
		const raw = await this.http.get("/workflows", opts);
		return createPageResult(asPagePayload<S.Escalation>(raw), (cursor) =>
			this.list({ ...opts, cursor }),
		);
	}

	async get(_escalationId: string): Promise<S.Escalation> {
		return this.http.get("/workflows");
	}

	async resolve(
		_escalationId: string,
		opts: z.input<typeof S.ResolveEscalationSchema>,
	): Promise<S.Escalation> {
		const body = S.ResolveEscalationSchema.parse(opts);
		return this.http.post("/workflows/batch", body);
	}

	async delegate(
		_escalationId: string,
		opts: { delegateTo: string; note?: string },
	): Promise<S.Escalation> {
		return this.http.post("/workflows/batch", opts);
	}

	async override(
		_escalationId: string,
		opts: {
			action: string;
			parameters?: Record<string, unknown>;
			reasoning?: string;
		},
	): Promise<S.Escalation> {
		return this.http.post("/workflows/batch", opts);
	}
}

export class ExperimentsAccessor {
	constructor(
		readonly _agentId: string,
		private readonly http: HttpClient,
	) {}

	async create(definition: S.ExperimentDefinition): Promise<Experiment> {
		const body = S.ExperimentDefinitionSchema.parse(definition);
		return this.http.post("/workflows/batch", body);
	}

	async get(_experimentId: string): Promise<Experiment> {
		return this.http.get("/workflows");
	}

	async conclude(
		_experimentId: string,
		opts: { winnerVariant: string; promoteToProduction?: boolean },
	): Promise<Experiment> {
		return this.http.post("/workflows/batch", opts);
	}
}

// Missing types that would be defined elsewhere
interface AgentMetrics {
	executionsToday: number;
	escalationRate: number;
	avgExecutionMs: number;
	successRate: number;
}

interface Experiment {
	id: string;
	name: string;
	status: string;
	variants: unknown[];
	metric: string;
	metricDirection: string;
	duration: string;
	minSampleSize?: number;
	winnerVariant?: string;
	promoteToProduction?: boolean;
}
