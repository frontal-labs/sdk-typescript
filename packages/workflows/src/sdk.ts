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

type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord {
  return typeof value === "object" && value !== null
    ? (value as ApiRecord)
    : {};
}

function unwrap(raw: unknown, key: string): ApiRecord {
  const envelope = asRecord(raw);
  return asRecord(envelope[key] ?? raw);
}

function resourceId(resource: ApiRecord, wireKey: string): string {
  const id = resource.id ?? resource[wireKey];
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError(`The API response did not contain ${wireKey}`);
  }
  return id;
}

function normalizeWorkflow(raw: unknown): S.Workflow {
  const workflow = unwrap(raw, "workflow");
  const status = String(workflow.status ?? "draft").toLowerCase();
  return S.WorkflowSchema.parse({
    ...workflow,
    id: resourceId(workflow, "workflowId"),
    status,
    version: Number(workflow.latestVersion ?? workflow.version ?? 0),
  });
}

function normalizeExecution(raw: unknown): S.WorkflowExecution {
  const execution = unwrap(raw, "execution");
  const workflowId = execution.workflowId;
  if (typeof workflowId !== "string" || workflowId.length === 0) {
    throw new TypeError("The API response did not contain workflowId");
  }
  const startedAt = execution.startedAt ?? execution.createdAt;
  return S.WorkflowExecutionSchema.parse({
    ...execution,
    id: resourceId(execution, "executionId"),
    workflowId,
    status: String(execution.status ?? "pending").toLowerCase(),
    stepExecutions: Array.isArray(execution.stepExecutions)
      ? execution.stepExecutions
      : [],
    triggeredBy: String(execution.startedBy ?? execution.triggeredBy ?? ""),
    ...(startedAt !== undefined ? { startedAt } : {}),
  });
}

function pageFrom<T>(
  raw: unknown,
  key: string
): { data: T[]; pagination: PaginationMeta } {
  const envelope = asRecord(raw);
  const data = Array.isArray(envelope[key]) ? (envelope[key] as T[]) : [];
  const cursor = String(
    envelope.nextPageToken ?? envelope.next_page_token ?? ""
  );
  return {
    data,
    pagination: { cursor, hasMore: cursor.length > 0 },
  };
}

function queryOptions(opts: {
  status?: string;
  limit?: number;
  cursor?: S.Cursor;
}): Record<string, unknown> {
  return {
    ...(opts.status !== undefined ? { status: opts.status } : {}),
    ...(opts.limit !== undefined ? { pageSize: opts.limit } : {}),
    ...(opts.cursor !== undefined ? { pageToken: opts.cursor } : {}),
  };
}

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
    const raw = await this.http.get("/workflows", queryOptions(opts));
    const page = pageFrom<unknown>(raw, "workflows");
    return createPageResult(
      page.data.map(normalizeWorkflow),
      page.pagination,
      (cursor: string) => this.list({ ...opts, cursor })
    );
  }

  /**
   * Creates a new workflow from a definition.
   * @param definition - The workflow definition (validated before sending).
   */
  async create(definition: S.WorkflowDefinition): Promise<S.Workflow> {
    const body = S.WorkflowDefinitionSchema.parse(definition);
    const base = await this.createBaseWorkflow(body);
    return base;
  }

  private async createBaseWorkflow(
    definition: S.WorkflowDefinition
  ): Promise<S.Workflow> {
    const slug = definition.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const created = await this.http.post("/workflows", {
      name: definition.name,
      slug,
      description: definition.description,
    });
    const workflow = normalizeWorkflow(created);
    await this.http.post(
      `/workflows/${encodeURIComponent(workflow.id)}/versions`,
      {
        spec: definition,
      }
    );
    return {
      ...workflow,
      ...definition,
      id: workflow.id,
      status: workflow.status,
      version: workflow.version,
    };
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
    const slug = definition.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const created = await this.http.post("/workflows", {
      name: definition.name,
      slug,
      description: definition.description,
    });
    const workflow = normalizeWorkflow(created);
    await this.http.post(
      `/workflows/${encodeURIComponent(workflow.id)}/versions`,
      {
        spec: definition,
      }
    );
    return {
      ...workflow,
      ...definition,
      id: workflow.id,
      status: workflow.status,
      version: workflow.version,
    };
  }

  /**
   * Creates and immediately activates the workflow.
   * @returns The activated workflow resource.
   */
  async activate(): Promise<S.Workflow> {
    const workflow = await this.create();
    return normalizeWorkflow(
      await this.http.post(
        `/workflows/${encodeURIComponent(workflow.id)}/publish`,
        {}
      )
    );
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
    return normalizeWorkflow(
      await this.http.get(`/workflows/${encodeURIComponent(this.id)}`)
    );
  }

  /**
   * Partially updates the workflow definition.
   * @param definition - Fields to update.
   */
  async update(definition: Partial<S.WorkflowDefinition>): Promise<S.Workflow> {
    return normalizeWorkflow(
      await this.http.patch(
        `/workflows/${encodeURIComponent(this.id)}`,
        definition
      )
    );
  }

  /**
   * Deletes the workflow.
   */
  async delete(): Promise<void> {
    return this.http.delete(`/workflows/${encodeURIComponent(this.id)}`);
  }

  /**
   * Activates the workflow, making it eligible for execution.
   */
  async activate(): Promise<S.Workflow> {
    return normalizeWorkflow(
      await this.http.post(
        `/workflows/${encodeURIComponent(this.id)}/publish`,
        {}
      )
    );
  }

  /**
   * Archives the workflow, preventing new executions.
   */
  async archive(): Promise<S.Workflow> {
    return normalizeWorkflow(
      await this.http.post(
        `/workflows/${encodeURIComponent(this.id)}/archive`,
        {}
      )
    );
  }

  /** Restores an archived workflow to draft status. */
  async restore(): Promise<S.Workflow> {
    return normalizeWorkflow(
      await this.http.post(
        `/workflows/${encodeURIComponent(this.id)}/restore`,
        {}
      )
    );
  }

  /**
   * Lists executions for this workflow.
   * @param opts - Status filter and pagination options.
   */
  async executions(
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.WorkflowExecution>> {
    const raw = await this.http.get("/workflows/executions", {
      workflowId: this.id,
      ...queryOptions(opts),
    });
    const page = pageFrom<unknown>(raw, "executions");
    return createPageResult(
      page.data.map(normalizeExecution),
      page.pagination,
      (cursor: string) => this.executions({ ...opts, cursor })
    );
  }

  /**
   * Fetches a specific execution by ID.
   * @param executionId - The execution ID.
   */
  async execution(executionId: string): Promise<S.WorkflowExecution> {
    return normalizeExecution(
      await this.http.get(
        `/workflows/executions/${encodeURIComponent(executionId)}`
      )
    );
  }

  /**
   * Triggers a new execution of this workflow.
   * @param input - Input data for the execution.
   */
  async trigger(
    input: Record<string, unknown> = {}
  ): Promise<S.WorkflowExecution> {
    return normalizeExecution(
      await this.http.post("/workflows/executions", {
        workflowId: this.id,
        input,
      })
    );
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
    const raw = await this.http.get("/workflows/approvals", queryOptions(opts));
    const page = pageFrom<unknown>(raw, "items");
    return createPageResult(
      page.data.map((item) => normalizeApproval(item)),
      page.pagination,
      (cursor: string) => this.list({ ...opts, cursor })
    );
  }

  /**
   * Fetches an approval request by ID.
   * @param _id - The approval ID.
   */
  async get(id: string): Promise<S.Approval> {
    return normalizeApproval(
      await this.http.get(`/workflows/approvals/${encodeURIComponent(id)}`)
    );
  }

  /**
   * Approves an approval request.
   * @param _id - The approval ID.
   * @param comment - Optional approval comment.
   */
  async approve(id: string, comment?: string): Promise<S.Approval> {
    return normalizeApproval(
      await this.http.post(
        `/workflows/approvals/${encodeURIComponent(id)}/approve`,
        { comment }
      )
    );
  }

  /**
   * Rejects an approval request.
   * @param _id - The approval ID.
   * @param comment - Optional rejection reason.
   */
  async reject(id: string, comment?: string): Promise<S.Approval> {
    return normalizeApproval(
      await this.http.post(
        `/workflows/approvals/${encodeURIComponent(id)}/reject`,
        { comment }
      )
    );
  }
}

function normalizeApproval(raw: unknown): S.Approval {
  const approval = unwrap(raw, "approval");
  return S.ApprovalSchema.parse({
    ...approval,
    id: resourceId(approval, "approvalId"),
    status: String(approval.status ?? "pending").toLowerCase(),
  });
}

/**
 * Task and step operations supported by the workflow execution API.
 */
export class StepsNamespace {
  constructor(private readonly http: HttpClient) {}

  async listTasks(
    executionId: string,
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.WorkflowTask>> {
    const raw = await this.http.get(
      `/workflows/executions/${encodeURIComponent(executionId)}/tasks`,
      queryOptions(opts)
    );
    const page = pageFrom<unknown>(raw, "tasks");
    return createPageResult(
      page.data.map(normalizeTask),
      page.pagination,
      (cursor: string) => this.listTasks(executionId, { ...opts, cursor })
    );
  }

  /** Fetches a task instance by ID. */
  async getTask(id: string): Promise<S.WorkflowTask> {
    const raw = await this.http.get(
      `/workflows/tasks/${encodeURIComponent(id)}`
    );
    return normalizeTask(raw);
  }

  /** Retries a failed task. */
  async retryTask(id: string): Promise<S.WorkflowTask> {
    const raw = await this.http.post(
      `/workflows/tasks/${encodeURIComponent(id)}/retry`,
      {}
    );
    return normalizeTask(raw);
  }

  /** Cancels a task. */
  async cancelTask(id: string, reason?: string): Promise<S.WorkflowTask> {
    const raw = await this.http.post(
      `/workflows/tasks/${encodeURIComponent(id)}/cancel`,
      { reason }
    );
    return normalizeTask(raw);
  }

  /** Lists step runs associated with a workflow run. */
  async listRunSteps(
    runId: string,
    opts: { status?: string; limit?: number; cursor?: S.Cursor } = {}
  ): Promise<PageResult<S.WorkflowRunStep>> {
    const raw = await this.http.get(
      `/workflows/runs/${encodeURIComponent(runId)}/steps`,
      queryOptions(opts)
    );
    const page = pageFrom<unknown>(raw, "steps");
    return createPageResult(
      page.data.map((step) => S.WorkflowRunStepSchema.parse(step)),
      page.pagination,
      (cursor: string) => this.listRunSteps(runId, { ...opts, cursor })
    );
  }
}

function normalizeTask(raw: unknown): S.WorkflowTask {
  const task = unwrap(raw, "task");
  return S.WorkflowTaskSchema.parse({
    ...task,
    id: task.id ?? resourceId(task, "taskId"),
    status: String(task.status ?? "unknown").toLowerCase(),
  });
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
    const query = {
      ...(opts.category !== undefined ? { category: opts.category } : {}),
      ...(opts.limit !== undefined ? { pageSize: opts.limit } : {}),
      ...(opts.cursor !== undefined ? { pageToken: opts.cursor } : {}),
    };
    const raw = await this.http.get("/workflows/templates", query);
    const page = pageFrom<unknown>(raw, "templates");
    return createPageResult(
      page.data.map(normalizeTemplate),
      page.pagination,
      (cursor: string) => this.list({ ...opts, cursor })
    );
  }

  /**
   * Fetches a workflow template by ID.
   * @param _id - The template ID.
   */
  async get(id: string): Promise<S.WorkflowTemplate> {
    return normalizeTemplate(
      await this.http.get(`/workflows/templates/${encodeURIComponent(id)}`)
    );
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
    return normalizeTemplate(
      await this.http.post("/workflows/templates", template)
    );
  }

  /**
   * Creates a new workflow from a template.
   * @param _id - The template ID.
   * @param name - Name for the new workflow.
   */
  async use(id: string, name: string): Promise<S.Workflow> {
    return normalizeWorkflow(
      await this.http.post(
        `/workflows/templates/${encodeURIComponent(id)}/instantiate`,
        { name }
      )
    );
  }
}

function normalizeTemplate(raw: unknown): S.WorkflowTemplate {
  const template = unwrap(raw, "template");
  return S.WorkflowTemplateSchema.parse({
    ...template,
    id: resourceId(template, "templateId"),
  });
}
