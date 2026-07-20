import {
  createPageResult,
  type HttpClient,
  type PageResult,
  type PaginationMeta,
  type PollOptions,
  pollUntil,
} from "@frontal-labs/_core";
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
 * Client for the Frontal Pipelines API (`/v1/data/pipelines/*`).
 */
export class PipelinesSdk {
  readonly lineage: LineageNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.lineage = new LineageNamespace(http);
  }

  /**
   * Starts building a new pipeline definition.
   * @param name - The pipeline name.
   */
  define(name: string): PipelineBuilder {
    return new PipelineBuilder(name, this.http);
  }

  /**
   * Returns an accessor for an existing pipeline by ID.
   * @param id - The pipeline ID.
   */
  use(id: string): PipelineAccessor {
    return new PipelineAccessor(id, this.http);
  }

  /**
   * Lists pipelines with optional status filter and pagination.
   * @param opts - Status filter and pagination options.
   */
  async list(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<S.Pipeline>> {
    const raw = await this.http.get("/data/pipelines/pipelines", {
      operation: "pipelines.list",
      ...opts,
    });
    return createPageResult(asPagePayload<S.Pipeline>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  /**
   * Creates a new pipeline from a definition.
   * @param definition - The pipeline definition (validated before sending).
   */
  async create(definition: S.PipelineDefinition): Promise<S.Pipeline> {
    const body = S.PipelineDefinitionSchema.parse(definition);
    return this.http.post("/data/pipelines/pipelines", {
      operation: "pipelines.create",
      definition: body,
    });
  }

  /**
   * Returns the capabilities of the pipelines service.
   */
  async capabilities(): Promise<Record<string, unknown>> {
    return this.http.get("/data/pipelines/capabilities");
  }
}

/**
 * Fluent builder for defining and creating pipelines.
 */
export class PipelineBuilder {
  private _definition: Partial<z.input<typeof S.PipelineDefinitionSchema>> & {
    name: string;
  };

  constructor(
    name: string,
    private readonly http: HttpClient
  ) {
    this._definition = { name, steps: [], tags: [] };
  }

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, ...payload };
  }

  /**
   * Sets a description for the pipeline.
   * @param text - The description text.
   */
  description(text: string): this {
    this._definition.description = text;
    return this;
  }
  /**
   * Sets a cron schedule for automatic pipeline runs.
   * @param cron - A cron expression.
   */
  schedule(cron: string): this {
    this._definition.schedule = cron;
    return this;
  }
  /**
   * Sets the maximum execution timeout for the pipeline.
   * @param duration - Duration string (e.g. "30s", "5m").
   */
  timeout(duration: string): this {
    this._definition.timeout = duration;
    return this;
  }
  /**
   * Sets the retry policy for pipeline runs.
   * @param policy - "linear", "exponential", or "none".
   */
  retryPolicy(policy: "linear" | "exponential" | "none"): this {
    this._definition.retryPolicy = policy;
    return this;
  }
  /**
   * Sets the error handling strategy for pipeline steps.
   * @param strategy - "fail", "skip", or "retry".
   */
  errorHandling(strategy: "fail" | "skip" | "retry"): this {
    this._definition.errorHandling = strategy;
    return this;
  }
  /**
   * Adds tags to the pipeline for categorization.
   * @param tags - Tag strings to attach.
   */
  tags(...tags: string[]): this {
    this._definition.tags = [...(this._definition.tags ?? []), ...tags];
    return this;
  }

  /**
   * Sets the data source for the pipeline.
   * @param source - The source configuration.
   */
  source(source: z.input<typeof S.PipelineSourceSchema>): this {
    this._definition.source = source;
    return this;
  }

  /**
   * Configures the pipeline to read from a graph entity type.
   * @param entityType - The entity type to source data from.
   * @param filter - Optional filter conditions.
   */
  fromGraph(entityType: string, filter?: Record<string, unknown>): this {
    this._definition.source = { type: "graph-entity", entityType, filter };
    return this;
  }

  /**
   * Configures the pipeline to be triggered by a webhook.
   * @param url - The webhook URL.
   * @param config - Optional webhook configuration.
   */
  fromWebhook(url: string, config?: Record<string, unknown>): this {
    this._definition.source = { type: "webhook", config: { url, ...config } };
    return this;
  }

  /**
   * Configures the pipeline to run on a cron schedule.
   * @param cron - A cron expression.
   */
  fromSchedule(cron: string): this {
    this._definition.source = { type: "schedule", cron };
    return this;
  }

  /**
   * Configures the pipeline for manual triggering only.
   */
  fromManual(): this {
    this._definition.source = { type: "manual" };
    return this;
  }

  /**
   * Adds a "collect" step to gather data from the source.
   * @param id - Step identifier.
   * @param config - Step configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  collect(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "collect", config, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "transform" step to transform data.
   * @param id - Step identifier.
   * @param config - Transformation configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  transform(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "transform", config, ...opts },
    ];
    return this;
  }

  /**
   * Adds an "enrich" step to augment data with external sources.
   * @param id - Step identifier.
   * @param config - Enrichment configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  enrich(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "enrich", config, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "validate" step to validate data quality.
   * @param id - Step identifier.
   * @param config - Validation configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  validate(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "validate", config, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "write" step to persist data to a destination.
   * @param id - Step identifier.
   * @param config - Write configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  write(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "write", config, ...opts },
    ];
    return this;
  }

  /**
   * Adds a "notify" step to send notifications.
   * @param id - Step identifier.
   * @param config - Notification configuration.
   * @param opts - Optional next step, condition, and timeout.
   */
  notify(
    id: string,
    config: Record<string, unknown> = {},
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "notify", config, ...opts },
    ];
    return this;
  }

  /**
   * Validates the definition and creates the pipeline on the API.
   * @returns The created pipeline resource.
   * @throws ZodError if the definition is invalid.
   */
  async create(): Promise<S.Pipeline> {
    const definition = S.PipelineDefinitionSchema.parse(this._definition);
    return this.http.post(
      "/data/pipelines/pipelines",
      this.command("pipelines.create", { definition })
    );
  }

  /**
   * Creates and immediately activates the pipeline.
   * @returns The activated pipeline resource.
   */
  async activate(): Promise<S.Pipeline> {
    const pipeline = await this.create();
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.activate", { pipelineId: pipeline.id })
    );
  }
}

/**
 * Accessor for a single pipeline resource.
 */
export class PipelineAccessor {
  constructor(
    private readonly id: string,
    private readonly http: HttpClient
  ) {}

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, pipelineId: this.id, ...payload };
  }

  /**
   * Fetches the pipeline definition and current state.
   */
  async get(): Promise<S.Pipeline> {
    return this.http.get(`/data/pipelines/pipelines/${this.id}`, {
      operation: "pipelines.get",
    });
  }

  /**
   * Partially updates the pipeline definition.
   * @param definition - Fields to update.
   */
  async update(definition: Partial<S.PipelineDefinition>): Promise<S.Pipeline> {
    return this.http.post(
      "/data/pipelines/pipelines",
      this.command("pipelines.update", { definition })
    );
  }

  /**
   * Deletes the pipeline.
   */
  async delete(): Promise<void> {
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.delete")
    );
  }

  /**
   * Lists runs for this pipeline with optional status filter and pagination.
   * @param opts - Status filter and pagination options.
   */
  async runs(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<S.PipelineRun>> {
    const raw = await this.http.get("/data/pipelines/pipeline-runs", {
      operation: "pipelines.runs.list",
      pipelineId: this.id,
      ...opts,
    });
    return createPageResult(asPagePayload<S.PipelineRun>(raw), (cursor) =>
      this.runs({ ...opts, cursor })
    );
  }

  /**
   * Fetches a specific run by ID.
   * @param runId - The run ID.
   */
  async run(runId: string): Promise<S.PipelineRun> {
    return this.http.get(`/data/pipelines/pipeline-runs/${runId}`, {
      operation: "pipelines.runs.get",
      pipelineId: this.id,
    });
  }

  /**
   * Triggers a new run of this pipeline.
   * @param input - Input data for the run.
   */
  async trigger(input: Record<string, unknown> = {}): Promise<S.PipelineRun> {
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.runs.trigger", input)
    );
  }

  /**
   * Lists backfills for this pipeline.
   * @param opts - Status filter and pagination options.
   */
  async backfills(
    opts: { status?: string; limit?: number; cursor?: string } = {}
  ): Promise<PageResult<S.Backfill>> {
    const raw = await this.http.get("/data/pipelines/runs", {
      operation: "pipelines.backfills.list",
      pipelineId: this.id,
      ...opts,
    });
    return createPageResult(asPagePayload<S.Backfill>(raw), (cursor) =>
      this.backfills({ ...opts, cursor })
    );
  }

  /**
   * Creates a backfill operation to reprocess historical data.
   * @param from - Start date/time ISO string.
   * @param to - End date/time ISO string.
   * @param opts - Strategy and dry run options.
   */
  async backfill(
    from: string,
    to: string,
    opts: { strategy?: "full" | "incremental"; dryRun?: boolean } = {}
  ): Promise<S.Backfill> {
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.backfills.create", { from, to, ...opts })
    );
  }

  /**
   * Returns the health status of this pipeline.
   */
  async health(): Promise<S.PipelineHealth> {
    return this.http.get("/data/pipelines/health", {
      operation: "pipelines.health",
      pipelineId: this.id,
    });
  }

  /**
   * Polls a pipeline run until it reaches a terminal status.
   */
  async waitForRun(
    runId: string,
    options?: Pick<
      PollOptions<S.PipelineRun>,
      "interval" | "timeout" | "signal"
    >
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
    runId: string
  ): AsyncIterable<{ type: string; data: unknown; id?: string }> {
    yield* this.http.stream(`/data/pipelines/pipeline-runs/${runId}`);
  }
}

/**
 * Namespace for pipeline lineage operations.
 */
export class LineageNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches the lineage graph for given pipelines or entity types.
   * @param opts - Filters for the lineage graph.
   */
  async graph(
    opts: {
      pipelineIds?: string[];
      entityType?: string;
      from?: string;
      to?: string;
    } = {}
  ): Promise<S.LineageGraph> {
    return this.http.get("/data/pipelines/info", opts);
  }
}
