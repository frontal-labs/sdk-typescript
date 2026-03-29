# API Reference

## GraphService

The main client class for interacting with the Frontal Graph database.

### Constructor

```typescript
new GraphService(http: HttpClient)
```

Creates a new GraphService instance with an HTTP client.

**Parameters:**
- `http`: HTTP client instance from `@frontal/core`

**Example:**
```typescript
import { GraphService } from "@frontal/graph";
import { getDefaultClient } from "@frontal/core";

const graph = new GraphService(getDefaultClient()._http);
```

### Methods

#### entities

```typescript
entities(entityType: string): EntityAccessor
```

Returns an accessor for managing entities of a specific type.

**Parameters:**
- `entityType`: The type of entities to manage

**Returns:** `EntityAccessor` instance for the specified entity type

**Example:**
```typescript
const userAccessor = graph.entities("user");
const users = await userAccessor.list();
```

#### query

```typescript
query(query: GraphQuery): Promise<PageResult<Entity>>
```

Executes a complex graph query with filtering, sorting, and pagination.

**Parameters:**
- `query`: Graph query configuration

**Returns:** Promise resolving to paginated results

**Example:**
```typescript
const result = await graph.query({
  entityType: "user",
  conditions: { status: "active" },
  include: ["company"],
  orderBy: [{ field: "createdAt", direction: "desc" }],
  limit: 20
});
```

#### naturalLanguageQuery

```typescript
naturalLanguageQuery(question: string, opts?: { entityType?: string; limit?: number }): Promise<{ answer: string; entities: Entity[]; confidence: number }>
```

Executes a natural language query against the graph.

**Parameters:**
- `question`: Natural language query string
- `opts` (optional): Query options

**Returns:** Promise resolving to query results with confidence score

**Example:**
```typescript
const result = await graph.naturalLanguageQuery(
  "Find all users who work at tech companies",
  { entityType: "user", limit: 10 }
);
```

#### semanticSearch

```typescript
semanticSearch(options: SemanticSearchOptions): Promise<{ results: Array<{ entity: Entity; score: number }>; query: string }>
```

Performs semantic search using vector embeddings.

**Parameters:**
- `options`: Search configuration

**Returns:** Promise resolving to similarity search results

**Example:**
```typescript
const results = await graph.semanticSearch({
  query: "senior software engineer",
  entityType: "user",
  limit: 5,
  threshold: 0.8
});
```

#### traverse

```typescript
traverse(request: TraversalRequest): Promise<{ paths: Array<Array<{ entity: Entity; edge: Edge }>>; totalFound: number }>
```

Traverses the graph from a starting entity.

**Parameters:**
- `request`: Traversal configuration

**Returns:** Promise resolving to traversal paths

**Example:**
```typescript
const paths = await graph.traverse({
  startEntity: { id: "user-123", type: "user" },
  direction: "outgoing",
  maxDepth: 3
});
```

#### findPath

```typescript
findPath(request: PathRequest): Promise<{ paths: Array<Array<{ entity: Entity; edge: Edge }>>; shortestPath?: Array<{ entity: Entity; edge: Edge }> }>
```

Finds paths between two entities.

**Parameters:**
- `request`: Path finding configuration

**Returns:** Promise resolving to found paths

**Example:**
```typescript
const result = await graph.findPath({
  fromEntity: { id: "user-1", type: "user" },
  toEntity: { id: "user-2", type: "user" },
  algorithm: "shortest"
});
```

#### batch

```typescript
batch(operations: Array<{ type: 'create' | 'update' | 'delete'; entityType: string; entity?: Entity; id?: string; fields?: Record<string, unknown> }>): Promise<BatchResult>
```

Executes multiple operations in a single batch.

**Parameters:**
- `operations`: Array of batch operations

**Returns:** Promise resolving to batch execution results

**Example:**
```typescript
const result = await graph.batch([
  { type: "create", entityType: "user", entity: { name: "Alice" } },
  { type: "create", entityType: "user", entity: { name: "Bob" } }
]);
```

#### history

Read-only property for accessing entity history operations.

```typescript
graph.history.get(entityId: string, entityType: string): Promise<EntityHistory>
graph.history.revert(entityId: string, entityType: string, toVersion: number): Promise<Entity>
```

## EntityAccessor

Provides CRUD operations for a specific entity type.

### Methods

#### get

```typescript
get(id: string, opts?: { version?: number; at?: string }): Promise<Entity>
```

Retrieves an entity by ID.

**Parameters:**
- `id`: Entity ID
- `opts` (optional): Retrieval options

**Returns:** Promise resolving to the entity

**Example:**
```typescript
const user = await graph.entities("user").get("user-123");
const historicalUser = await graph.entities("user").get("user-123", { version: 2 });
```

#### create

```typescript
create(fields: Record<string, unknown>): Promise<Entity>
```

Creates a new entity.

**Parameters:**
- `fields`: Entity data fields

**Returns:** Promise resolving to the created entity

**Example:**
```typescript
const user = await graph.entities("user").create({
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 30
});
```

#### update

```typescript
update(id: string, fields: Record<string, unknown>, opts?: { version?: number }): Promise<Entity>
```

Updates an existing entity.

**Parameters:**
- `id`: Entity ID
- `fields`: Fields to update
- `opts` (optional): Update options

**Returns:** Promise resolving to the updated entity

**Example:**
```typescript
const updated = await graph.entities("user").update("user-123", {
  name: "Alice Smith"
});
```

#### delete

```typescript
delete(id: string): Promise<void>
```

Deletes an entity.

**Parameters:**
- `id`: Entity ID

**Returns:** Promise resolving when deletion is complete

**Example:**
```typescript
await graph.entities("user").delete("user-123");
```

#### list

```typescript
list(opts?: { conditions?: Record<string, unknown>; limit?: number; cursor?: string }): Promise<PageResult<Entity>>
```

Lists entities with optional filtering and pagination.

**Parameters:**
- `opts` (optional): List options

**Returns:** Promise resolving to paginated results

**Example:**
```typescript
const users = await graph.entities("user").list({
  conditions: { status: "active" },
  limit: 10
});
```

#### relationships

```typescript
relationships(id: string): Promise<{ data: LinkedEntity[] }>
```

Gets relationships for an entity.

**Parameters:**
- `id`: Entity ID

**Returns:** Promise resolving to relationship data

**Example:**
```typescript
const relationships = await graph.entities("user").relationships("user-123");
```

#### addRelationship

```typescript
addRelationship(id: string, targetEntityId: string, relationType: string, opts?: { weight?: number }): Promise<Edge>
```

Adds a relationship from an entity to another entity.

**Parameters:**
- `id`: Source entity ID
- `targetEntityId`: Target entity ID
- `relationType`: Type of relationship
- `opts` (optional): Relationship options

**Returns:** Promise resolving to the created edge

**Example:**
```typescript
const edge = await graph.entities("user").addRelationship(
  "user-123",
  "company-456",
  "WORKS_FOR",
  { weight: 1.0 }
);
```

#### removeRelationship

```typescript
removeRelationship(id: string, relationshipId: string): Promise<void>
```

Removes a relationship from an entity.

**Parameters:**
- `id`: Entity ID
- `relationshipId`: Relationship ID to remove

**Returns:** Promise resolving when removal is complete

**Example:**
```typescript
await graph.entities("user").removeRelationship("user-123", "rel-789");
```

#### query

```typescript
query(): QueryBuilder<Entity>
```

Returns a query builder for complex queries.

**Returns:** `QueryBuilder` instance

**Example:**
```typescript
const users = await graph.entities("user")
  .query()
  .where({ status: "active" })
  .orderBy("createdAt", "desc")
  .limit(10)
  .execute();
```

## QueryBuilder

Provides a fluent interface for building queries.

### Methods

#### where

```typescript
where(conditions: Record<string, unknown>): this
```

Adds filter conditions to the query.

**Parameters:**
- `conditions`: Filter conditions

**Returns:** QueryBuilder instance for chaining

#### include

```typescript
include(...relations: string[]): this
```

Specifies related entities to include in results.

**Parameters:**
- `relations`: Array of relation names

**Returns:** QueryBuilder instance for chaining

#### orderBy

```typescript
orderBy(field: string, direction?: 'asc' | 'desc'): this
```

Adds sorting to the query.

**Parameters:**
- `field`: Field to sort by
- `direction`: Sort direction (default: 'asc')

**Returns:** QueryBuilder instance for chaining

#### limit

```typescript
limit(n: number): this
```

Sets the maximum number of results.

**Parameters:**
- `n`: Maximum number of results

**Returns:** QueryBuilder instance for chaining

#### fields

```typescript
fields(...fields: string[]): this
```

Specifies which fields to return.

**Parameters:**
- `fields`: Array of field names

**Returns:** QueryBuilder instance for chaining

#### at

```typescript
at(timestamp: string | Date): this
```

Queries data as it existed at a specific point in time.

**Parameters:**
- `timestamp`: Point in time to query

**Returns:** QueryBuilder instance for chaining

#### execute

```typescript
execute(): Promise<PageResult<Entity>>
```

Executes the query and returns paginated results.

**Returns:** Promise resolving to query results

#### first

```typescript
first(): Promise<Entity | null>
```

Executes the query and returns only the first result.

**Returns:** Promise resolving to first entity or null

#### count

```typescript
count(): Promise<number>
```

Executes the query and returns the count of matching entities.

**Returns:** Promise resolving to entity count

#### exists

```typescript
exists(): Promise<boolean>
```

Executes the query and returns whether any entities match.

**Returns:** Promise resolving to boolean indicating existence

#### all

```typescript
all(): Promise<Entity[]>
```

Executes the query and returns all results as an array.

**Returns:** Promise resolving to array of entities

## Types

### Entity

Represents a graph entity node.

```typescript
interface Entity {
  id: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  meta?: EntityMeta;
  linkedEntities?: LinkedEntity[];
  createdAt: string;
  updatedAt: string;
}
```

### Edge

Represents a relationship between entities.

```typescript
interface Edge {
  id: string;
  fromEntity: { id: string; type: string };
  toEntity: { id: string; type: string };
  relationType: string;
  weight?: number;
  createdAt: string;
}
```

### GraphQuery

Configuration for graph queries.

```typescript
interface GraphQuery {
  entityType: string;
  conditions?: Record<string, unknown>;
  include?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  cursor?: string;
  at?: string;
}
```

### TraversalRequest

Configuration for graph traversal.

```typescript
interface TraversalRequest {
  startEntity: { id: string; type: string };
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;
  filters?: Record<string, unknown>;
}
```

### PathRequest

Configuration for path finding.

```typescript
interface PathRequest {
  fromEntity: { id: string; type: string };
  toEntity: { id: string; type: string };
  maxPaths?: number;
  algorithm?: 'shortest' | 'all' | 'weighted';
}
```

### SemanticSearchOptions

Configuration for semantic search.

```typescript
interface SemanticSearchOptions {
  query: string;
  entityType?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  threshold?: number;
}
```

### BatchResult

Result of batch operations.

```typescript
interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    entity: Record<string, unknown>;
    error: string;
  }>;
}
```

### EntityHistory

Historical changes for an entity.

```typescript
interface EntityHistory {
  entityId: string;
  entityType: string;
  history: Array<{
    version: number;
    changes: Array<{
      field: string;
      from: unknown;
      to: unknown;
    }>;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
}
```

## Utility Functions

### createGraphClient

```typescript
createGraphClient(client: FrontalClient): GraphService
```

Creates a GraphService instance with a custom FrontalClient.

**Parameters:**
- `client`: FrontalClient instance

**Returns:** GraphService instance

**Example:**
```typescript
import { createGraphClient } from "@frontal/graph";
import { FrontalClient } from "@frontal/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const graph = createGraphClient(client);
```

## Default Export

The package also exports a default graph instance configured with environment variables:

```typescript
import { graph } from "@frontal/graph";

// Use the default instance
const users = await graph.entities("user").list();
```
