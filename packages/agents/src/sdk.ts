import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PollOptions,
  pollUntil,
} from "frontal/core";
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
  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Starts building a new agent definition.
   * @param name - The name of the agent.
   */
  define(name: string): AgentBuilder {
    return new AgentBuilder(name, this.http);
  }

  /**
   * Returns an accessor for an existing agent by ID.
   * @param id - The agent ID.
   */
  use(id: string): AgentAccessor {
    return new AgentAccessor(id, this.http);
  }

  /**
   * Lists agents with optional status and trigger filters.
   * @param opts - Filters (status, trigger) and pagination options.
   */
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

  /**
   * Creates a new agent from a definition.
   * @param definition - The agent definition (validated before sending).
   */
  async create(definition: S.AgentDefinition): Promise<S.Agent> {
    const body = S.AgentDefinitionSchema.parse(definition);
    return this.http.post("/agents", body);
  }

  /** Health check for the agents service. */
  async health(): Promise<{ status: string } & Record<string, unknown>> {
    return this.http.get("/agents/health");
  }
}

/**
 * Fluent builder for defining and creating agents.
 */
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

  /**
   * Sets a human-readable description for the agent.
   * @param text - The description text.
   */
  description(text: string): this {
    this._definition.description = text;
    return this;
  }

  /**
   * Adds a trigger event that activates the agent.
   * @param event - The event name.
   * @param filter - Optional conditions to filter events.
   */
  trigger(event: string, filter?: Record<string, unknown>): this {
    this._definition.triggers = [
      ...(this._definition.triggers ?? []),
      { event, filter },
    ];
    return this;
  }

  /**
   * Sets the full scope configuration for the agent.
   * @param scope - The scope object (read/write/action permissions).
   */
  scope(scope: z.input<typeof S.AgentScopeSchema>): this {
    this._definition.scope = scope;
    return this;
  }

  /**
   * Grants read access to one or more entity types.
   * @param entityTypes - Entity type names to allow reading.
   */
  canRead(...entityTypes: string[]): this {
    this._definition.scope = {
      ...this._definition.scope,
      read: [...(this._definition.scope?.read ?? []), ...entityTypes],
    };
    return this;
  }

  /**
   * Grants write access to one or more entity types.
   * @param entityTypes - Entity type names to allow writing.
   */
  canWrite(...entityTypes: string[]): this {
    this._definition.scope = {
      ...this._definition.scope,
      write: [...(this._definition.scope?.write ?? []), ...entityTypes],
    };
    return this;
  }

  /**
   * Registers actions the agent is allowed to invoke.
   * @param actions - Action names to allow.
   */
  canInvoke(...actions: string[]): this {
    this._definition.scope = {
      ...this._definition.scope,
      actions: [...(this._definition.scope?.actions ?? []), ...actions],
    };
    return this;
  }

  /**
   * Configures conditions that cause the agent to escalate.
   * @param conditions - Escalation condition names.
   */
  escalatesOn(...conditions: string[]): this {
    this._definition.scope = {
      ...this._definition.scope,
      escalate: [...(this._definition.scope?.escalate ?? []), ...conditions],
    };
    return this;
  }

  /**
   * Sets the confidence threshold configuration.
   * @param config - Confidence thresholds for auto-execute, escalate, review.
   */
  confidence(config: z.input<typeof S.ConfidenceConfigSchema>): this {
    this._definition.confidence = config;
    return this;
  }

  /**
   * Sets the confidence threshold above which the agent auto-executes.
   * @param threshold - Value between 0 and 1.
   */
  autoExecuteAbove(threshold: number): this {
    this._definition.confidence = {
      ...this._definition.confidence,
      autoExecuteAbove: threshold,
    };
    return this;
  }

  /**
   * Sets the confidence threshold below which the agent escalates.
   * @param threshold - Value between 0 and 1.
   */
  escalateBelow(threshold: number): this {
    this._definition.confidence = {
      ...this._definition.confidence,
      escalateBelow: threshold,
    };
    return this;
  }

  /**
   * Configures the agent's memory settings.
   * @param config - Memory type, TTL, and token limits.
   */
  memory(config: z.input<typeof S.MemoryConfigSchema>): this {
    this._definition.memory = config;
    return this;
  }

  /**
   * Configures retry behavior for the agent.
   * @param config - Retry configuration (max retries, backoff, etc.).
   */
  retry(config: z.input<typeof S.retryConfigSchema>): this {
    this._definition.retry = config;
    return this;
  }

  /**
   * Sets the maximum execution timeout for the agent.
   * @param duration - Duration string (e.g. "30s", "5m").
   */
  timeout(duration: string): this {
    this._definition.timeout = duration;
    return this;
  }

  /**
   * Configures rate limiting for the agent.
   * @param config - Rate limit configuration.
   */
  rateLimit(config: z.input<typeof S.RateLimitConfigSchema>): this {
    this._definition.rateLimit = config;
    return this;
  }

  /**
   * Adds tags to the agent for categorization.
   * @param tags - Tag strings to attach.
   */
  tags(...tags: string[]): this {
    this._definition.tags = [...(this._definition.tags ?? []), ...tags];
    return this;
  }

  /**
   * Registers a behavior handler for a specific event.
   * @param event - The event name to handle.
   * @param handler - The handler function.
   */
  on(event: string, handler: AgentHandler): this {
    this._handlers.set(event, handler);
    return this;
  }

  /**
   * Validates the definition and creates the agent on the API.
   * @returns The created agent resource.
   * @throws ZodError if the definition is invalid.
   */
  async create(): Promise<S.Agent> {
    const definition = S.AgentDefinitionSchema.parse(this._definition);
    const agent = await this.http.post("/agents", definition);
    return agent as S.Agent;
  }
}

/**
 * Accessor for a single agent resource. Provides get/update/delete operations,
 * run management, version history, and streaming.
 */
export class AgentAccessor {
  constructor(
    private readonly id: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Fetches the agent definition and current state.
   */
  async get(): Promise<S.Agent> {
    return this.http.get(`/agents/${this.id}`);
  }

  /**
   * Partially updates the agent definition.
   * @param definition - Fields to update.
   */
  async update(definition: Partial<S.AgentDefinition>): Promise<S.Agent> {
    return this.http.put(`/agents/${this.id}`, definition);
  }

  /**
   * Deletes the agent.
   */
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
