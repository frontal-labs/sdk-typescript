import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
  type PollOptions,
  pollUntil,
} from "@frontal-labs/core";
import type { z } from "zod";
import * as S from "./schemas";

const asPagePayload = <T>(
  raw: unknown
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

/**
 * Client for the Frontal Workflows API (`/v1/workflows/*`).
 */
export class WorkflowsSdk {
  readonly approvals: ApprovalsNamespace;
  readonly steps: StepsNamespace;
  readonly templates: TemplatesNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.approvals = new ApprovalsNamespace(http);
    this.steps = new StepsNamespace(http);
    this.templates = new TemplatesNamespace(http);
  }

  /**
   * Starts building a new workflow definition.
   * @param name - The workflow name.
   */
  define(name: string): WorkflowBuilder {
    return new WorkflowBuilder(name, this.http);
  }

  /**
   * Returns an accessor for an existing workflow by ID.
   * @param id - The workflow ID.
   */
  use(id: string): WorkflowAccessor {
    return new WorkflowAccessor(id, this.http);
  }

  /**
   * Lists workflows with optional status filter and pagination.
   * @param opts - Status filter and pagination options.
   */
  async list(
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.Workflow>> {
    const raw = await this.http.get("/workflows", opts);
    return createPageResult(asPagePayload<S.Workflow>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Creates a new workflow from a definition.
   * @param definition - The workflow definition (validated before sending).
   */
  async create(definition: S.WorkflowDefinition): Promise<S.Workflow> {
    const body = S.WorkflowDefinitionSchema.parse(definition);
    return this.http.post("/workflows", body);
  }
}

/**
 * Fluent builder for defining and creating workflows.
 */
export class WorkflowBuilder {
  private _definition: Partial<z.input<typeof S.WorkflowDefinitionSchema>> & {
    name: string;
  };

  constructor(
    name: string,
    private readonly http: HttpClient
  ) {
    this._definition = { name, triggers: [], steps: [], tags: [] };
  }

  /**
   * Sets a description for the workflow.
   * @param text - The description text.
   */
  description(text: string): this {
    this._definition.description = text;
    return this;
  }
  /**
   * Sets the semantic version string for the workflow.
   * @param version - Version string (e.g. "1.0.0").
   */
  version(version: string): this {
    this._definition.version = version;
    return this;
  }
  /**
   * Sets workflow-level variables.
   * @param vars - Key-value pairs of variables.
   */
  variables(vars: Record<string, unknown>): this {
    this._definition.variables = vars;
    return this;
  }
  /**
   * Adds tags to the workflow for categorization.
   * @param tags - Tag strings to attach.
   */
  tags(...tags: string[]): this {
    this._definition.tags = [...(this._definition.tags ?? []), ...tags];
    return this;
  }

  /**
   * Adds a trigger configuration to the workflow.
   * @param trigger - The trigger definition.
   */
  trigger(trigger: z.input<typeof S.WorkflowTriggerSchema>): this {
    this._definition.triggers = [...(this._definition.triggers ?? []), trigger];
    return this;
  }

  /**
   * Adds a manual trigger (requires explicit invocation).
   */
  manual(): this {
    this._definition.triggers = [
      ...(this._definition.triggers ?? []),
      { type: "manual" as const },
    ];
    return this;
  }

  /**
   * Adds a schedule-based trigger.
   * @param cron - A cron expression.
   */
  schedule(cron: string): this {
    this._definition.triggers = [
      ...(this._definition.triggers ?? []),
      { type: "schedule" as const, schedule: cron },
    ];
    return this;
  }

  /**
   * Adds an event-based trigger.
   * @param eventType - The event type to listen for.
   * @param config - Optional event configuration.
   */
  event(eventType: string, config?: Record<string, unknown>): this {
    this._definition.triggers = [
      ...(this._definition.triggers ?? []),
      { type: "event" as const, eventType, config },
    ];
    return this;
  }

  /**
   * Adds a webhook-based trigger.
   * @param url - The webhook URL.
   */
  webhook(url: string): this {
    this._definition.triggers = [
      ...(this._definition.triggers ?? []),
      { type: "webhook" as const, webhookUrl: url },
    ];
    return this;
  }

  /**
   * Adds a step to the workflow.
   * @param step - The step definition.
   */
  step(step: z.input<typeof S.WorkflowStepSchema>): this {
    this._definition.steps = [...(this._definition.steps ?? []), step];
    return this;
  }

  /**
   * Adds a "task" step that executes configurable logic.
   * @param id - Step identifier.
   * @param config - Task configuration.
   * @param opts - Optional name, description, dependencies, and timeout.
   */
  task(
    id: string,
    config: Record<string, unknown> = {},
    opts: {
      name?: string;
      description?: string;
      dependsOn?: string[];
      timeout?: string;
    } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "task" as const, config, ...opts },
    ];
    return this;
  }

  /**
   * Adds an "approval" step requiring designated approvers.
   * @param id - Step identifier.
   * @param approvers - List of approver user IDs.
   * @param opts - Optional name, description, dependencies, and timeout.
   */
  approval(
    id: string,
    approvers: string[],
    opts: {
      name?: string;
      description?: string;
      dependsOn?: string[];
      timeout?: string;
    } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "approval" as const, config: { approvers }, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "condition" step that evaluates an expression for branching.
   * @param id - Step identifier.
   * @param expression - The condition expression to evaluate.
   * @param opts - Optional name, description, and dependencies.
   */
  condition(
    id: string,
    expression: string,
    opts: { name?: string; description?: string; dependsOn?: string[] } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      {
        id,
        type: "condition" as const,
        condition: expression,
        ...opts,
      },
    ];
    return this;
  }

  /**
   * Adds a "parallel" step that executes child steps concurrently.
   * @param id - Step identifier.
   * @param steps - List of child step IDs to run in parallel.
   * @param opts - Optional name, description, and dependencies.
   */
  parallel(
    id: string,
    steps: string[],
    opts: { name?: string; description?: string; dependsOn?: string[] } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "parallel" as const, config: { steps }, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "delay" step that waits for a specified duration.
   * @param id - Step identifier.
   * @param duration - The delay duration string (e.g. "30s", "5m").
   * @param opts - Optional name, description, and dependencies.
   */
  delay(
    id: string,
    duration: string,
    opts: { name?: string; description?: string; dependsOn?: string[] } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "delay" as const, config: { duration }, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "notification" step that sends a message via specified channels.
   * @param id - Step identifier.
   * @param message - The notification message content.
   * @param channels - The channels to send on (e.g. ["email", "slack"]).
   * @param opts - Optional name, description, and dependencies.
   */
  notification(
    id: string,
    message: string,
    channels: string[],
    opts: { name?: string; description?: string; dependsOn?: string[] } = {}
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

  /**
   * Validates the definition and creates the workflow on the API.
   * @returns The created workflow resource.
   * @throws ZodError if the definition is invalid.
   */
  async create(): Promise<S.Workflow> {
    const definition = S.WorkflowDefinitionSchema.parse(this._definition);
    return this.http.post("/workflows", definition);
  }

  /**
   * Creates and immediately activates the workflow.
   * @returns The activated workflow resource.
   */
  async activate(): Promise<S.Workflow> {
    const _workflow = await this.create();
    return this.http.patch("/workflows", { status: "active" });
  }
}

/**
 * Accessor for a single workflow resource.
 */
export class WorkflowAccessor {
  constructor(
    private readonly id: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Fetches the workflow definition and current state.
   */
  async get(): Promise<S.Workflow> {
    return this.http.get("/workflows");
  }

  /**
   * Partially updates the workflow definition.
   * @param definition - Fields to update.
   */
  async update(definition: Partial<S.WorkflowDefinition>): Promise<S.Workflow> {
    return this.http.put("/workflows", definition);
  }

  /**
   * Deletes the workflow.
   */
  /**
   * Deletes the workflow.
   */
  async delete(): Promise<void> {
    return this.http.delete("/workflows");
  }

  /**
   * Activates the workflow, making it eligible for execution.
   */
  async activate(): Promise<S.Workflow> {
    return this.http.patch("/workflows", { status: "active" });
  }

  /**
   * Pauses the workflow, preventing new executions.
   */
  async pause(): Promise<S.Workflow> {
    return this.http.patch("/workflows", { status: "paused" });
  }

  /**
   * Lists executions for this workflow.
   * @param opts - Status filter and pagination options.
   */
  async executions(
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.WorkflowExecution>> {
    const raw = await this.http.post("/workflows/search", {
      workflowId: this.id,
      ...opts,
    });
    return createPageResult(asPagePayload<S.WorkflowExecution>(raw), (cursor) =>
      this.executions({ ...opts, cursor })
    );
  }

  /**
   * Fetches a specific execution by ID.
   * @param executionId - The execution ID.
   */
  async execution(executionId: string): Promise<S.WorkflowExecution> {
    return this.http.get(`/workflows/${this.id}/${executionId}`);
  }

  /** Fetch a compact summary of a workflow execution. */
  async executionSummary(
    executionId: string
  ): Promise<Record<string, unknown>> {
    return this.http.get(`/workflows/${this.id}/${executionId}/summary`);
  }

  /**
   * Triggers a new execution of this workflow.
   * @param input - Input data for the execution.
   */
  async trigger(
    input: Record<string, unknown> = {}
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
    >
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
    executionId: string
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    yield* this.http.stream(`/workflows/${this.id}/${executionId}/timeline`);
  }
}

/**
 * Namespace for workflow approval operations.
 */
export class ApprovalsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Lists approval requests with optional filter and pagination.
   * @param opts - Status filter and pagination options.
   */
  async list(
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.Approval>> {
    const raw = await this.http.get("/workflows", opts);
    return createPageResult(asPagePayload<S.Approval>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Fetches an approval request by ID.
   * @param _id - The approval ID.
   */
  async get(_id: string): Promise<S.Approval> {
    return this.http.get("/workflows");
  }

  /**
   * Approves an approval request.
   * @param _id - The approval ID.
   * @param comment - Optional approval comment.
   */
  async approve(_id: string, comment?: string): Promise<S.Approval> {
    return this.http.post("/workflows/batch", { comment });
  }

  /**
   * Rejects an approval request.
   * @param _id - The approval ID.
   * @param comment - Optional rejection reason.
   */
  async reject(_id: string, comment?: string): Promise<S.Approval> {
    return this.http.post("/workflows/batch", { comment });
  }
}

/**
 * Namespace for standalone workflow step definitions.
 */
export class StepsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Lists all standalone step definitions.
   */
  async list(): Promise<S.StepDefinition[]> {
    return this.http.get("/workflows");
  }

  /**
   * Fetches a step definition by ID.
   * @param _id - The step ID.
   */
  async get(_id: string): Promise<S.StepDefinition> {
    return this.http.get("/workflows");
  }

  /**
   * Creates a new standalone step definition.
   * @param definition - The step definition.
   */
  async create(definition: S.StepDefinition): Promise<S.StepDefinition> {
    const body = S.StepDefinitionSchema.parse(definition);
    return this.http.post("/workflows", body);
  }

  /**
   * Updates a standalone step definition.
   * @param _id - The step ID.
   * @param definition - Fields to update.
   */
  async update(
    _id: string,
    definition: Partial<S.StepDefinition>
  ): Promise<S.StepDefinition> {
    return this.http.put("/workflows", definition);
  }

  /**
   * Deletes a step definition.
   * @param _id - The step ID.
   */
  async delete(_id: string): Promise<void> {
    return this.http.delete("/workflows");
  }
}

/**
 * Namespace for reusable workflow templates.
 */
export class TemplatesNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Lists workflow templates with optional category filter and pagination.
   * @param opts - Category filter and pagination options.
   */
  async list(
    opts: { category?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.WorkflowTemplate>> {
    const raw = await this.http.get("/workflows", opts);
    return createPageResult(asPagePayload<S.WorkflowTemplate>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Fetches a workflow template by ID.
   * @param _id - The template ID.
   */
  async get(_id: string): Promise<S.WorkflowTemplate> {
    return this.http.get("/workflows");
  }

  /**
   * Creates a new workflow template.
   * @param template - The template definition.
   */
  async create(template: {
    name: string;
    description?: string;
    category?: string;
    definition: S.WorkflowDefinition;
  }): Promise<S.WorkflowTemplate> {
    return this.http.post("/workflows", template);
  }

  /**
   * Creates a new workflow from a template.
   * @param _id - The template ID.
   * @param name - Name for the new workflow.
   */
  async use(_id: string, name: string): Promise<S.Workflow> {
    return this.http.post("/workflows/batch", { name });
  }
}
