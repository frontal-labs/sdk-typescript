import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PollOptions,
  pollUntil,
} from "@frontal-labs/core";
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

/**
 * Client for the Frontal AgentsSdk API (`/v1/agents/*`).
 *
 * AgentsSdk are defined and managed as first-class resources; each invocation
 * creates a **run** under `/v1/agents/{id}/runs`, and runs can be polled,
 * inspected, or streamed. Paths are written without the leading `/v1` because
 * the client base URL already includes it.
 */
export class AgentsSdk {
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
    } = {}
  ): Promise<PageResult<S.Agent>> {
    const raw = await this.http.get("/agents", opts);
    return createPageResult(asPagePayload<S.Agent>(raw), (cursor: string) =>
      this.list({ ...opts, cursor })
    );
  }

  async create(definition: S.AgentDefinition): Promise<S.Agent> {
    const body = S.AgentDefinitionSchema.parse(definition);
    return this.http.post("/agents", body);
  }

  /** Health check for the agents service. */
  async health(): Promise<{ status: string } & Record<string, unknown>> {
    return this.http.get("/agents/health");
  }
}

export class AgentBuilder {
  private _definition: Partial<z.input<typeof S.AgentDefinitionSchema>> & {
    name: string;
  };
  private _handlers: Map<string, AgentHandler> = new Map();

  constructor(
    name: string,
    private readonly http: HttpClient
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
    const agent = await this.http.post("/agents", definition);
    return agent as S.Agent;
  }
}

export class AgentAccessor {
  constructor(
    private readonly id: string,
    private readonly http: HttpClient
  ) {}

  async get(): Promise<S.Agent> {
    return this.http.get(`/agents/${this.id}`);
  }

  async update(definition: Partial<S.AgentDefinition>): Promise<S.Agent> {
    return this.http.put(`/agents/${this.id}`, definition);
  }

  async delete(): Promise<void> {
    return this.http.delete(`/agents/${this.id}`);
  }

  /** Roll the agent back to a previous version. */
  async rollback(opts: { toVersion?: number } = {}): Promise<S.Agent> {
    return this.http.post(`/agents/${this.id}/rollback`, opts);
  }

  /** List the agent's versions. */
  async versions(
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<PageResult<unknown>> {
    const raw = await this.http.get(`/agents/${this.id}/versions`, opts);
    return createPageResult(asPagePayload<unknown>(raw), (cursor: string) =>
      this.versions({ ...opts, cursor })
    );
  }

  /** List runs for this agent. */
  async runs(
    opts: {
      status?: string;
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<S.Execution>> {
    const raw = await this.http.get(`/agents/${this.id}/runs`, opts);
    return createPageResult(asPagePayload<S.Execution>(raw), (cursor: string) =>
      this.runs({ ...opts, cursor })
    );
  }

  /** Fetch a single run by id. */
  async run(runId: string): Promise<S.Execution> {
    return this.http.get(`/agents/runs/${runId}`);
  }

  /** Fetch the conversation transcript for a run. */
  async conversation(runId: string): Promise<{ messages: unknown[] }> {
    return this.http.get(`/agents/runs/${runId}/conversation`);
  }

  /**
   * Start a new run by sending the agent an event/message.
   * Returns the created run.
   */
  async message(
    event: string,
    payload: Record<string, unknown>
  ): Promise<S.Execution> {
    return this.http.post(`/agents/${this.id}/runs`, { event, payload });
  }

  /**
   * Polls a run until it reaches a terminal status.
   * @param runId - The run to wait for.
   * @param options - Polling options (interval, timeout, signal).
   * @returns The completed run.
   * @throws TimeoutError if the timeout is exceeded.
   */
  async waitForCompletion(
    runId: string,
    options?: Pick<PollOptions<S.Execution>, "interval" | "timeout" | "signal">
  ): Promise<S.Execution> {
    return pollUntil(() => this.run(runId), {
      ...options,
      until: (run: S.Execution) =>
        ["completed", "failed", "escalated"].includes(run.status),
    });
  }

  /**
   * Watches a run via SSE, yielding events as they occur.
   * @param runId - The run to watch.
   * @returns AsyncIterable of SSE events.
   */
  async *watch(
    runId: string
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    yield* this.http.stream(`/agents/runs/${runId}/stream`);
  }
}
