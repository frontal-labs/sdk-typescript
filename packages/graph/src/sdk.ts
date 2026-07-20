import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
  type QueryBuilder,
} from "frontal/core";
import * as S from "./schemas";

/**
 * Client for querying and traversing the Frontal entity graph.
 * Routes map to the `/ontology/graph/*` API endpoints.
 */
export class GraphSdk {
  readonly history: HistoryNamespace;

  /**
   * @param http - The HTTP client used to make API requests.
   */
  constructor(private readonly http: HttpClient) {
    this.history = new HistoryNamespace(http);
  }

  /**
   * Returns an accessor for a specific entity type.
   * @param entityType - The entity type name.
   */
  use(entityType: string): EntityAccessor {
    return new EntityAccessor(entityType, this.http);
  }

  /**
   * Queries the graph for entities matching the given query.
   * @param query - The graph query with conditions, ordering, and pagination.
   */
  async query(query: S.GraphQuery): Promise<PageResult<S.Entity>> {
    const body = S.GraphQuerySchema.parse(query);
    const raw = await this.http.post("/ontology/graph/graph/query", body);
    return createPageResult(asPagePayload<S.Entity>(raw), (cursor) =>
      this.query({ ...query, cursor })
    );
  }

  /**
   * Queries the graph using natural language.
   * @param question - The natural language question.
   * @param opts - Optional entity type filter and limit.
   */
  async naturalLanguageQuery(
    question: string,
    opts: { entityType?: string; limit?: number } = {}
  ): Promise<{ answer: string; entities: S.Entity[]; confidence: number }> {
    return this.http.post("/ontology/graph/graph/analyze", {
      question,
      ...opts,
    });
  }

  /**
   * Performs semantic search across entities.
   * @param options - Search options including query, entity type, and threshold.
   */
  async semanticSearch(options: S.SemanticSearchOptions): Promise<{
    results: { entity: S.Entity; score: number }[];
    query: string;
  }> {
    const body = S.SemanticSearchOptionsSchema.parse(options);
    return this.http.post("/ontology/graph/graph/neighborhood", body);
  }

  /**
   * Traverses the graph starting from an entity.
   * @param request - Traversal parameters (start, direction, depth).
   */
  async traverse(request: S.TraversalRequest): Promise<{
    paths: { entity: S.Entity; edge: S.Edge }[][];
    totalFound: number;
  }> {
    const body = S.TraversalRequestSchema.parse(request);
    return this.http.post("/ontology/graph/graph/neighborhood", body);
  }

  /**
   * Finds paths between two entities.
   * @param request - Path finding parameters (from, to, algorithm).
   */
  async findPath(request: S.PathRequest): Promise<{
    paths: { entity: S.Entity; edge: S.Edge }[][];
    shortestPath?: { entity: S.Entity; edge: S.Edge }[];
  }> {
    const body = S.PathRequestSchema.parse(request);
    return this.http.post("/ontology/graph/graph/path", body);
  }

  /**
   * Executes a batch of create/update/delete operations.
   * @param operations - Array of operations to perform.
   */
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

  /**
   * Reads many entities/relationships in a single request.
   * @param request - Bulk read parameters (ids, entityType).
   */
  async bulkRead(
    request: { ids?: string[]; entityType?: string } & Record<string, unknown>
  ): Promise<{ entities: S.Entity[] }> {
    return this.http.post("/ontology/graph/graph/bulk-read", request);
  }

  /**
   * Fetches a single relationship by id.
   * @param id - The relationship ID.
   */
  async getRelationship(id: string): Promise<S.Edge> {
    return this.http.get(`/ontology/graph/relationships/${id}`);
  }

  /**
   * Updates a relationship by id.
   * @param id - The relationship ID.
   * @param fields - Fields to update.
   */
  async updateRelationship(
    id: string,
    fields: Record<string, unknown>
  ): Promise<S.Edge> {
    return this.http.put(`/ontology/graph/relationships/${id}`, { fields });
  }

  /**
   * Fetches the status of an asynchronous graph run.
   * @param runId - The run ID.
   */
  async run(runId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/ontology/graph/runs/${runId}`);
  }

  /**
   * Returns the capabilities of the graph service.
   */
  capabilities(): Promise<Record<string, unknown>> {
    return this.http.get("/ontology/graph/capabilities");
  }
  /**
   * Health check for the graph service.
   */
  health(): Promise<Record<string, unknown>> {
    return this.http.get("/ontology/graph/health");
  }
  /**
   * Returns service info/metadata for the graph service.
   */
  info(): Promise<Record<string, unknown>> {
    return this.http.get("/ontology/graph/info");
  }
}

/**
 * Accessor for a single entity type, providing CRUD and relationship operations.
 */
export class EntityAccessor {
  constructor(
    private readonly entityType: string,
    private readonly http: HttpClient
  ) {}

  /**
   * Fetches an entity by ID with optional version/timestamp targeting.
   * @param id - The entity ID.
   * @param opts - Optional version or timestamp for point-in-time queries.
   */
  async get(
    id: string,
    opts: { version?: number; at?: string } = {}
  ): Promise<S.Entity> {
    const params = { ...opts };
    return this.http.get(`/ontology/graph/entities/${id}`, params);
  }

  /**
   * Creates a new entity.
   * @param fields - The entity field values.
   */
  async create(fields: Record<string, unknown>): Promise<S.Entity> {
    return this.http.post("/ontology/graph/entities", { fields });
  }

  /**
   * Updates an existing entity.
   * @param id - The entity ID.
   * @param fields - Fields to update.
   * @param opts - Optional version for optimistic concurrency control.
   */
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

  /**
   * Deletes an entity by ID.
   * @param id - The entity ID.
   */
  async delete(id: string): Promise<void> {
    return this.http.delete(`/ontology/graph/entities/${id}`);
  }

  /**
   * Lists entities with optional filter conditions and pagination.
   * @param opts - Filter conditions, limit, and cursor for pagination.
   */
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

  /**
   * Lists relationships (linked entities) for a given entity.
   * @param id - The entity ID.
   */
  async relationships(id: string): Promise<{ data: S.LinkedEntity[] }> {
    return this.http.get(`/ontology/graph/entities/${id}/provenance`);
  }

  /**
   * Adds a relationship from this entity to a target entity.
   * @param id - The source entity ID.
   * @param targetEntityId - The target entity ID.
   * @param relationType - The relation type name.
   * @param opts - Optional weight for the relationship.
   */
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

  /**
   * Removes a relationship by its ID.
   * @param _id - The source entity ID (unused).
   * @param relationshipId - The relationship ID to remove.
   */
  async removeRelationship(_id: string, relationshipId: string): Promise<void> {
    return this.http.delete(`/ontology/graph/relationships/${relationshipId}`);
  }

  /**
   * Returns a query builder for this entity type.
   */
  query(): QueryBuilder<S.Entity> {
    return new GraphQueryBuilder(this.entityType, this.http);
  }
}

/**
 * Namespace for entity version history operations.
 */
export class HistoryNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetches the version history for an entity.
   * @param entityId - The entity ID.
   * @param _entityType - The entity type name.
   */
  async get(entityId: string, _entityType: string): Promise<S.EntityHistory> {
    return this.http.get(`/ontology/graph/entities/${entityId}/provenance`);
  }

  /**
   * Reverts an entity to a previous version.
   * @param _entityId - The entity ID.
   * @param _entityType - The entity type name.
   * @param toVersion - The target version number.
   */
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
