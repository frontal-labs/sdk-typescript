import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PollOptions,
  pollUntil,
  type StreamOptions,
  type StreamPart,
  type ToolSet,
} from "@frontal-labs/core";
import type { z } from "zod";
import type { AgentHandler } from "./context";
import {
  type AgentDefinitionOptions,
  type AgentRuntimeHints,
  normalizeTriggers,
} from "./definition";
import * as Schemas from "./schemas";

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
   * Starts building a new agent definition. Pass an options object for the
   * typed one-shot form, or chain builder methods; both end with `.create()`.
   *
   * @example
   * ```ts
   * const triage = agents.define("ticket-triager", {
   *   triggers: "support.ticket.created",
   *   stateSchema: z.object({ tier: z.string() }),
   * });
   * const agent = await triage.create();
   * for await (const e of agent.watch(runId)) {
   *   if (e.type === "state") console.log(e.state.tier);
   * }
   * ```
   */
  define(name: string): AgentBuilder;
  define<TState extends z.ZodType>(
    name: string,
    options: AgentDefinitionOptions<TState>
  ): AgentBuilder<TState>;
  define<TState extends z.ZodType>(
    name: string,
    options?: AgentDefinitionOptions<TState>
  ): AgentBuilder<TState> {
    const builder = new AgentBuilder<TState>(name, this.http);
    return options ? builder.configure(options) : builder;
  }

  /**
   * Returns an accessor for an existing agent by ID. Pass `stateSchema` to
   * get typed `state` events from `watch()`.
   */
  use(id: string): AgentAccessor;
  use<TState extends z.ZodType>(
    id: string,
    hints: AgentRuntimeHints<TState>
  ): AgentAccessor<TState>;
  use<TState extends z.ZodType>(
    id: string,
    hints: AgentRuntimeHints<TState> = {}
  ): AgentAccessor<TState> {
    return new AgentAccessor<TState>(id, this.http, hints);
  }

  /**
   * Lists agents with optional status and trigger filters.
   * @param opts - Filters (status, trigger) and pagination options.
   */
  async list(
    opts: {
      status?: z.infer<typeof Schemas.AgentStatusSchema>;
      trigger?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<Schemas.Agent>> {
    const raw = await this.http.get("/agents", opts);
    return createPageResult(
      asPagePayload<Schemas.Agent>(raw),
      (cursor: string) => this.list({ ...opts, cursor })
    );
  }

  /**
   * Creates a new agent from a definition.
   * @param definition - The agent definition (validated before sending).
   */
  async create(
    definition: Schemas.AgentDefinitionInput
  ): Promise<Schemas.Agent> {
    const body = Schemas.AgentDefinitionSchema.parse(definition);
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
export class AgentBuilder<TState extends z.ZodType = z.ZodType> {
  private _definition: Partial<
    z.input<typeof Schemas.AgentDefinitionSchema>
  > & {
    name: string;
  };
  private _hints: AgentRuntimeHints<TState> = {};

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
  scope(scope: z.input<typeof Schemas.AgentScopeSchema>): this {
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
  confidence(config: z.input<typeof Schemas.ConfidenceConfigSchema>): this {
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
  memory(config: z.input<typeof Schemas.MemoryConfigSchema>): this {
    this._definition.memory = config;
    return this;
  }

  /**
   * Configures retry behavior for the agent.
   * @param config - Retry configuration (max retries, backoff, etc.).
   */
  retry(config: z.input<typeof Schemas.retryConfigSchema>): this {
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
  rateLimit(config: z.input<typeof Schemas.RateLimitConfigSchema>): this {
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
   * @deprecated Local handlers are not executed by the hosted runtime and
   * were never uploaded. This method now throws so the gap is visible;
   * express behaviour via `tools`, `scope`, and triggers instead.
   */
  on(_event: string, _handler: AgentHandler): never {
    throw new Error(
      "AgentBuilder.on() is not supported: handlers run on the Frontal runtime, not locally. Use define(name, { tools, triggers }) instead."
    );
  }

  /**
   * Applies a typed options object (the `define(name, options)` form).
   */
  configure(options: AgentDefinitionOptions<TState>): this {
    if (options.description) this.description(options.description);
    for (const t of normalizeTriggers(options.triggers)) {
      this._definition.triggers = [...(this._definition.triggers ?? []), t];
    }
    if (options.tags?.length) this.tags(...options.tags);
    if (options.scope) this.scope(options.scope);
    if (options.confidence) this.confidence(options.confidence);
    if (options.memory) this.memory(options.memory);
    if (options.retry) this.retry(options.retry);
    if (options.timeout) this.timeout(options.timeout);
    if (options.rateLimit) this.rateLimit(options.rateLimit);
    this._hints = {
      stateSchema: options.stateSchema,
      stateEvent: options.stateEvent,
      tools: options.tools,
      approveWhen: options.approveWhen,
      approvers: options.approvers,
    };
    return this;
  }

  /** Attach a state schema so `watch()` yields typed `state` events. */
  state<TNext extends z.ZodType>(schema: TNext): AgentBuilder<TNext> {
    const next = this as unknown as AgentBuilder<TNext>;
    next._hints = {
      ...this._hints,
      stateSchema: schema,
    } as AgentRuntimeHints<TNext>;
    return next;
  }

  /** Tools the agent may call. */
  tools(tools: ToolSet): this {
    this._hints.tools = tools;
    return this;
  }

  /** Human approval contract; see `toApprovalStep()`. */
  approveWhen(
    predicate: (state: z.infer<TState>) => boolean,
    approvers?: string[]
  ): this {
    this._hints.approveWhen = predicate;
    if (approvers) this._hints.approvers = approvers;
    return this;
  }

  /** The definition as it will be sent (before defaults). */
  toJSON(): Schemas.AgentDefinitionInput {
    return this._definition as Schemas.AgentDefinitionInput;
  }

  /**
   * Validates the definition and creates the agent on the API.
   * @returns A typed accessor for the created agent (has `.agent` for the
   * raw resource).
   * @throws Error listing the invalid fields if the definition is invalid.
   */
  async create(): Promise<CreatedAgent<TState>> {
    const parsed = Schemas.AgentDefinitionSchema.safeParse(this._definition);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ");
      throw new Error(
        `Invalid agent definition "${this._definition.name}": ${fields}`
      );
    }
    const agent = (await this.http.post(
      "/agents",
      parsed.data
    )) as Schemas.Agent;
    // Accessor first so resource fields (id, name, status, ...) win on read,
    // and `.agent` keeps the untouched resource for serialization.
    const accessor = new AgentAccessor<TState>(
      agent.id,
      this.http,
      this._hints
    );
    return Object.assign(accessor, agent, { agent }) as CreatedAgent<TState>;
  }
}

/**
 * Return type of `AgentBuilder.create()`: the agent resource's fields
 * (`id`, `name`, `status`, ...) plus every accessor method
 * (`message`, `watch`, `waitForCompletion`, ...), and `.agent` for the raw
 * resource.
 */
export type CreatedAgent<TState extends z.ZodType = z.ZodType> =
  AgentAccessor<TState> & Schemas.Agent & { readonly agent: Schemas.Agent };

/**
 * Accessor for a single agent resource. Provides get/update/delete operations,
 * run management, version history, and streaming.
 */
export class AgentAccessor<TState extends z.ZodType = z.ZodType> {
  constructor(
    readonly id: string,
    private readonly http: HttpClient,
    readonly hints: AgentRuntimeHints<TState> = {}
  ) {}

  /**
   * Whether a run state requires human approval per the definition's
   * `approveWhen`. Always `false` when no predicate was given.
   */
  requiresApproval(state: z.infer<TState>): boolean {
    return this.hints.approveWhen?.(state) ?? false;
  }

  /**
   * Fetches the agent definition and current state.
   */
  async get(): Promise<Schemas.Agent> {
    return this.http.get(`/agents/${this.id}`);
  }

  /**
   * Partially updates the agent definition.
   * @param definition - Fields to update.
   */
  async update(
    definition: Partial<Schemas.AgentDefinition>
  ): Promise<Schemas.Agent> {
    return this.http.put(`/agents/${this.id}`, definition);
  }

  /**
   * Deletes the agent.
   */
  async delete(): Promise<void> {
    return this.http.delete(`/agents/${this.id}`);
  }

  /** Roll the agent back to a previous version. */
  async rollback(opts: { toVersion?: number } = {}): Promise<Schemas.Agent> {
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
  ): Promise<PageResult<Schemas.Execution>> {
    const raw = await this.http.get(`/agents/${this.id}/runs`, opts);
    return createPageResult(
      asPagePayload<Schemas.Execution>(raw),
      (cursor: string) => this.runs({ ...opts, cursor })
    );
  }

  /** Fetch a single run by id. */
  async run(runId: string): Promise<Schemas.Execution> {
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
  ): Promise<Schemas.Execution> {
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
    options?: Pick<
      PollOptions<Schemas.Execution>,
      "interval" | "timeout" | "signal"
    >
  ): Promise<Schemas.Execution> {
    return pollUntil(() => this.run(runId), {
      ...options,
      until: (run: Schemas.Execution) =>
        ["completed", "failed", "escalated"].includes(run.status),
    });
  }

  /**
   * Watches a run via SSE. Yields {@link AgentRunEvent} parts: server events
   * as `{ type: "event", event, data }`, failures as `{ type: "error" }`
   * (with `error.retryable`), `{ type: "abort" }` when `signal` fires, and a
   * final `{ type: "done" }`. Never throws mid-stream.
   *
   * @param runId - The run to watch.
   * @param options - `signal` to abort the stream.
   *
   * @example
   * ```ts
   * for await (const e of agent.watch(run.id)) {
   *   if (e.type === "event") console.log(e.event, e.data);
   *   if (e.type === "error" && e.error.retryable) console.log("retry");
   * }
   * ```
   */
  async *watch(
    runId: string,
    options: StreamOptions = {}
  ): AsyncIterable<AgentRunEvent<z.infer<TState>>> {
    const schema = this.hints.stateSchema;
    const stateEvent = this.hints.stateEvent ?? DEFAULT_STATE_EVENT;
    for await (const part of this.http.streamParts(
      `/agents/runs/${runId}/stream`,
      undefined,
      options
    )) {
      if (part.type !== "data") {
        yield part;
        continue;
      }
      if (schema && part.event === stateEvent) {
        const parsed = schema.safeParse(part.data);
        if (parsed.success) {
          yield {
            type: "state",
            state: parsed.data as z.infer<TState>,
            id: part.id,
          };
          continue;
        }
      }
      yield { type: "event", event: part.event, data: part.data, id: part.id };
    }
  }
}

/** Default SSE event name that carries the run's state snapshot. */
const DEFAULT_STATE_EVENT = "state";

/**
 * A part of an agent run stream. `event` carries a server-sent event;
 * `state` is a typed snapshot (only when a `stateSchema` was given);
 * the rest are control parts (see {@link StreamPart}).
 */
export type AgentRunEvent<TState = unknown> =
  | { type: "event"; event: string; data: unknown; id?: string }
  | { type: "state"; state: TState; id?: string }
  | Exclude<StreamPart, { type: "data" }>;
