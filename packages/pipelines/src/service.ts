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

export class PipelinesService {
  readonly lineage = new LineageNamespace(this.http);
  constructor(private readonly http: HttpClient) {}

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, ...payload };
  }

  define(name: string): PipelineBuilder {
    return new PipelineBuilder(name, this.http);
  }

  use(id: string): PipelineAccessor {
    return new PipelineAccessor(id, this.http);
  }

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

  async create(definition: S.PipelineDefinition): Promise<S.Pipeline> {
    const body = S.PipelineDefinitionSchema.parse(definition);
    return this.http.post(
      "/data/pipelines/pipelines",
      this.command("pipelines.create", { definition: body })
    );
  }
}

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
    opts: { next?: string; condition?: string; timeout?: string } = {}
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
    opts: { next?: string; condition?: string; timeout?: string } = {}
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
    opts: { next?: string; condition?: string; timeout?: string } = {}
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
    opts: { next?: string; condition?: string; timeout?: string } = {}
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
    opts: { next?: string; condition?: string; timeout?: string } = {}
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
    opts: { next?: string; condition?: string; timeout?: string } = {}
  ): this {
    this._definition.steps = [
      ...(this._definition.steps ?? []),
      { id, type: "notify", config, ...opts },
    ];
    return this;
  }

  async create(): Promise<S.Pipeline> {
    const definition = S.PipelineDefinitionSchema.parse(this._definition);
    return this.http.post(
      "/data/pipelines/pipelines",
      this.command("pipelines.create", { definition })
    );
  }

  async activate(): Promise<S.Pipeline> {
    const pipeline = await this.create();
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.activate", { pipelineId: pipeline.id })
    );
  }
}

export class PipelineAccessor {
  constructor(
    private readonly id: string,
    private readonly http: HttpClient
  ) {}

  private command(operation: string, payload: Record<string, unknown> = {}) {
    return { operation, pipelineId: this.id, ...payload };
  }

  async get(): Promise<S.Pipeline> {
    return this.http.get(`/data/pipelines/pipelines/${this.id}`, {
      operation: "pipelines.get",
    });
  }

  async update(definition: Partial<S.PipelineDefinition>): Promise<S.Pipeline> {
    return this.http.post(
      "/data/pipelines/pipelines",
      this.command("pipelines.update", { definition })
    );
  }

  async delete(): Promise<void> {
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.delete")
    );
  }

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

  async run(runId: string): Promise<S.PipelineRun> {
    return this.http.get(`/data/pipelines/pipeline-runs/${runId}`, {
      operation: "pipelines.runs.get",
      pipelineId: this.id,
    });
  }

  async trigger(input: Record<string, unknown> = {}): Promise<S.PipelineRun> {
    return this.http.post(
      "/data/pipelines/runs",
      this.command("pipelines.runs.trigger", input)
    );
  }

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

export class LineageNamespace {
  constructor(private readonly http: HttpClient) {}

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

  async upstream(
    _entityType: string,
    _entityId: string
  ): Promise<{ pipelines: S.Pipeline[]; entities: unknown[] }> {
    return this.http.get("/data/pipelines/info");
  }

  async downstream(
    _entityType: string,
    _entityId: string
  ): Promise<{ pipelines: S.Pipeline[]; entities: unknown[] }> {
    return this.http.get("/data/pipelines/info");
  }
}
