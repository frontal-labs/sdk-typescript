import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type QueryBuilder,
} from "@frontal-labs/core";
import * as S from "./schemas";

export class GraphService {
  readonly history: HistoryNamespace;

  constructor(private readonly http: HttpClient) {
    this.history = new HistoryNamespace(http);
  }

  use(entityType: string): EntityAccessor {
    return new EntityAccessor(entityType, this.http);
  }

  async query(query: S.GraphQuery): Promise<PageResult<S.Entity>> {
    const body = S.GraphQuerySchema.parse(query);
    const raw = await this.http.post("/ontology/graph/graph/query", body);
    return createPageResult(asPagePayload<S.Entity>(raw), (cursor) =>
      this.query({ ...query, cursor })
    );
  }

  async naturalLanguageQuery(
    question: string,
    opts: { entityType?: string; limit?: number } = {}
  ): Promise<{ answer: string; entities: S.Entity[]; confidence: number }> {
    return this.http.post("/ontology/graph/graph/analyze", {
      question,
      ...opts,
    });
  }

  async semanticSearch(options: S.SemanticSearchOptions): Promise<{
    results: { entity: S.Entity; score: number }[];
    query: string;
  }> {
    const body = S.SemanticSearchOptionsSchema.parse(options);
    return this.http.post("/ontology/graph/graph/neighborhood", body);
  }

  async traverse(request: S.TraversalRequest): Promise<{
    paths: { entity: S.Entity; edge: S.Edge }[][];
    totalFound: number;
  }> {
    const body = S.TraversalRequestSchema.parse(request);
    return this.http.post("/ontology/graph/graph/neighborhood", body);
  }

  async findPath(request: S.PathRequest): Promise<{
    paths: { entity: S.Entity; edge: S.Edge }[][];
    shortestPath?: { entity: S.Entity; edge: S.Edge }[];
  }> {
    const body = S.PathRequestSchema.parse(request);
    return this.http.post("/ontology/graph/graph/path", body);
  }

  async batch(
    operations: {
      type: "create" | "update" | "delete";
      entityType: string;
      entity?: S.Entity;
      id?: string;
      fields?: Record<string, unknown>;
    }[]
  ): Promise<S.BatchResult> {
    return this.http.post("/ontology/graph/graph/build", { operations });
  }
}

export class EntityAccessor {
  constructor(
    private readonly entityType: string,
    private readonly http: HttpClient
  ) {}

  async get(
    id: string,
    opts: { version?: number; at?: string } = {}
  ): Promise<S.Entity> {
    const params = { ...opts };
    return this.http.get(`/ontology/graph/entities/${id}`, params);
  }

  async create(fields: Record<string, unknown>): Promise<S.Entity> {
    return this.http.post("/ontology/graph/entities", { fields });
  }

  async update(
    id: string,
    fields: Record<string, unknown>,
    opts: { version?: number } = {}
  ): Promise<S.Entity> {
    const params = opts.version ? { version: opts.version } : undefined;
    return this.http.put(`/ontology/graph/entities/${id}`, {
      fields,
      ...params,
    });
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/graph/entities/${id}`);
  }

  async list(
    opts: {
      conditions?: Record<string, unknown>;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<PageResult<S.Entity>> {
    const raw = await this.http.get("/ontology/graph/entities", opts);
    return createPageResult(asPagePayload<S.Entity>(raw), (cursor) =>
      this.list({ ...opts, cursor })
    );
  }

  async relationships(id: string): Promise<{ data: S.LinkedEntity[] }> {
    return this.http.get(`/ontology/graph/entities/${id}/provenance`);
  }

  async addRelationship(
    id: string,
    targetEntityId: string,
    relationType: string,
    opts: { weight?: number } = {}
  ): Promise<S.Edge> {
    return this.http.post(`/ontology/graph/entities/${id}/provenance`, {
      targetEntityId,
      relationType,
      ...opts,
    });
  }

  async removeRelationship(_id: string, relationshipId: string): Promise<void> {
    return this.http.delete(`/ontology/graph/relationships/${relationshipId}`);
  }

  query(): QueryBuilder<S.Entity> {
    return new GraphQueryBuilder(this.entityType, this.http);
  }
}

export class HistoryNamespace {
  constructor(private readonly http: HttpClient) {}

  async get(entityId: string, _entityType: string): Promise<S.EntityHistory> {
    return this.http.get(`/ontology/graph/entities/${entityId}/provenance`);
  }

  async revert(
    _entityId: string,
    _entityType: string,
    toVersion: number
  ): Promise<S.Entity> {
    return this.http.post("/ontology/graph/runs", {
      toVersion,
    });
  }
}

class GraphQueryBuilder implements QueryBuilder<S.Entity> {
  private _query: Partial<S.GraphQuery>;

  constructor(
    private readonly entityType: string,
    private readonly http: HttpClient
  ) {
    this._query = { entityType };
  }

  where(conditions: NonNullable<S.GraphQuery["conditions"]>): this {
    this._query.conditions = conditions;
    return this;
  }

  include(...relations: string[]): this {
    this._query.include = relations;
    return this;
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): this {
    this._query.orderBy = [
      ...(this._query.orderBy ?? []),
      { field, direction },
    ];
    return this;
  }

  limit(n: number): this {
    this._query.limit = n;
    return this;
  }

  fields(..._fields: string[]): this {
    // Implementation would filter returned fields
    return this;
  }

  at(timestamp: string | Date): this {
    this._query.at =
      typeof timestamp === "string" ? timestamp : timestamp.toISOString();
    return this;
  }

  async execute(): Promise<PageResult<S.Entity>> {
    const body = S.GraphQuerySchema.parse(this._query);
    const raw = await this.http.post("/ontology/graph/graph/query", body);
    return createPageResult(asPagePayload<S.Entity>(raw), (_cursor) =>
      this.execute()
    );
  }

  async first(): Promise<S.Entity | null> {
    this._query.limit = 1;
    const result = await this.execute();
    return result.data[0] ?? null;
  }

  async count(): Promise<number> {
    // Would need a dedicated count endpoint or use limit=0
    const result = await this.execute();
    return result.pagination.total ?? result.data.length;
  }

  async exists(): Promise<boolean> {
    const entity = await this.first();
    return entity !== null;
  }

  async all(): Promise<S.Entity[]> {
    const result = await this.execute();
    return result.all();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<S.Entity> {
    const result = await this.execute();
    for await (const entity of result) {
      yield entity;
    }
  }
}
