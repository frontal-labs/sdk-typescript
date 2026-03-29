# Architecture

## System Overview

The Frontal Graph SDK is designed as a comprehensive graph database client that provides type-safe operations for entities, relationships, and complex graph traversals. The architecture follows a layered approach with clear separation of concerns between entity management, query execution, and graph traversal operations.

## Architecture Layers

### 1. Service Layer

The service layer provides the main entry point for all graph operations:

- **GraphService**: Primary client class coordinating all graph operations
- **EntityAccessor**: Specialized accessor for entity-specific operations
- **HistoryNamespace**: Handles entity versioning and historical queries

### 2. Query Layer

The query layer handles all data retrieval and manipulation operations:

- **QueryBuilder**: Fluent interface for building complex queries
- **GraphQueryBuilder**: Specialized query builder for graph operations
- **Natural Language Processing**: Converts natural language to structured queries
- **Semantic Search**: Vector-based similarity search implementation

### 3. Traversal Layer

The traversal layer manages graph navigation and path finding:

- **Graph Traversal**: Depth-first and breadth-first traversal algorithms
- **Path Finding**: Shortest path and all-paths algorithms
- **Relationship Navigation**: Efficient relationship traversal

### 4. Type System Layer

The type system ensures type safety and data validation:

- **Zod Schemas**: Runtime validation for all data structures
- **TypeScript Interfaces**: Compile-time type checking
- **Type Inference**: Automatic type generation from schemas

## Core Components

### GraphService

The main service class that orchestrates all graph operations:

```typescript
class GraphService {
  constructor(private readonly http: HttpClient)
  
  entities(entityType: string): EntityAccessor
  query(query: GraphQuery): Promise<PageResult<Entity>>
  naturalLanguageQuery(question: string, opts?: NLQueryOptions): Promise<NLResult>
  semanticSearch(options: SemanticSearchOptions): Promise<SemanticResult>
  traverse(request: TraversalRequest): Promise<TraversalResult>
  findPath(request: PathRequest): Promise<PathResult>
  batch(operations: BatchOperation[]): Promise<BatchResult>
  readonly history: HistoryNamespace
}
```

### EntityAccessor

Provides CRUD operations for specific entity types:

```typescript
class EntityAccessor {
  constructor(private readonly entityType: string, private readonly http: HttpClient)
  
  get(id: string, opts?: GetOptions): Promise<Entity>
  create(fields: Record<string, unknown>): Promise<Entity>
  update(id: string, fields: Record<string, unknown>, opts?: UpdateOptions): Promise<Entity>
  delete(id: string): Promise<void>
  list(opts?: ListOptions): Promise<PageResult<Entity>>
  relationships(id: string): Promise<RelationshipData>
  addRelationship(id: string, targetId: string, type: string, opts?: RelOptions): Promise<Edge>
  removeRelationship(id: string, relId: string): Promise<void>
  query(): GraphQueryBuilder
}
```

### QueryBuilder

Provides a fluent interface for building queries:

```typescript
interface QueryBuilder<T> {
  where(conditions: Record<string, unknown>): this
  include(...relations: string[]): this
  orderBy(field: string, direction?: 'asc' | 'desc'): this
  limit(n: number): this
  fields(...fields: string[]): this
  at(timestamp: string | Date): this
  execute(): Promise<PageResult<T>>
  first(): Promise<T | null>
  count(): Promise<number>
  exists(): Promise<boolean>
  all(): Promise<T[]>
  [Symbol.asyncIterator](): AsyncIterator<T>
}
```

## Data Flow Architecture

### Entity Operations Flow

```
Client Request
    ↓
EntityAccessor Method
    ↓
HTTP Request Preparation
    ↓
Schema Validation
    ↓
API Request
    ↓
Response Processing
    ↓
Schema Validation
    ↓
Typed Response
```

### Query Execution Flow

```
QueryBuilder Configuration
    ↓
Query Building
    ↓
Schema Validation
    ↓
HTTP Request
    ↓
Backend Query Processing
    ↓
Response Pagination
    ↓
Typed Results
```

### Traversal Flow

```
Traversal Request
    ↓
Algorithm Selection (DFS/BFS/Dijkstra)
    ↓
Graph Navigation
    ↓
Path Construction
    ↓
Result Aggregation
    ↓
Typed Response
```

## Query Architecture

### Structured Queries

Structured queries use a declarative approach:

```typescript
interface GraphQuery {
  entityType: string;
  conditions?: Record<string, unknown>;
  include?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  cursor?: string;
  at?: string; // Temporal query
}
```

### Natural Language Processing

Natural language queries undergo several processing steps:

```
Natural Language Input
    ↓
Intent Recognition
    ↓
Entity Extraction
    ↓
Query Construction
    ↓
Structured Query Execution
    ↓
Natural Language Response
```

### Semantic Search Architecture

Semantic search uses vector embeddings:

```
Search Query
    ↓
Text Embedding Generation
    ↓
Vector Similarity Search
    ↓
Result Ranking
    ↓
Filtered Results
```

## Traversal Architecture

### Traversal Algorithms

The SDK implements multiple traversal strategies:

1. **Depth-First Search (DFS)**: Explores as far as possible along each branch
2. **Breadth-First Search (BFS)**: Explores all neighbors at current depth
3. **Dijkstra's Algorithm**: Finds shortest weighted paths
4. **A* Search**: Heuristic-based path finding

### Path Finding

Path finding supports multiple algorithms:

```typescript
type PathAlgorithm = 'shortest' | 'all' | 'weighted';

interface PathRequest {
  fromEntity: { id: string; type: string };
  toEntity: { id: string; type: string };
  maxPaths?: number;
  algorithm?: PathAlgorithm;
}
```

## Relationship Architecture

### Relationship Types

Relationships are first-class citizens with rich metadata:

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

### Relationship Directionality

The SDK supports bidirectional and unidirectional relationships:

- **Outgoing**: Relationships from the source entity
- **Incoming**: Relationships to the source entity
- **Both**: Bidirectional traversal

## Batch Operations Architecture

### Batch Processing

Batch operations optimize performance by reducing network round trips:

```typescript
interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entity?: Entity;
  id?: string;
  fields?: Record<string, unknown>;
}
```

### Transaction Handling

Batch operations support transactional semantics:

```
Batch Request
    ↓
Operation Validation
    ↓
Transaction Start
    ↓
Operation Execution
    ↓
Success/Failure Aggregation
    ↓
Transaction Commit/Rollback
    ↓
Batch Result
```

## History and Versioning Architecture

### Entity Versioning

All entities maintain a complete version history:

```typescript
interface EntityHistory {
  entityId: string;
  entityType: string;
  history: Array<{
    version: number;
    changes: Array<{ field: string; from: unknown; to: unknown }>;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
}
```

### Temporal Queries

The SDK supports querying data as it existed at specific points in time:

```typescript
// Query entities as they existed at a specific time
const historicalUsers = await graph.query({
  entityType: "user",
  at: "2023-01-01T00:00:00Z"
});
```

## Performance Architecture

### Pagination

All list operations use cursor-based pagination for efficiency:

```typescript
interface PageResult<T> {
  data: T[];
  pagination: {
    hasNext: boolean;
    cursor?: string;
    total?: number;
  };
}
```

### Caching Strategy

The SDK implements intelligent caching:

- **Entity Cache**: In-memory caching of frequently accessed entities
- **Query Cache**: Caching of complex query results
- **Relationship Cache**: Caching of relationship mappings

### Index Utilization

The SDK leverages database indexes for optimal performance:

- **Primary Key Indexes**: Fast entity lookups by ID
- **Secondary Indexes**: Efficient filtering on common fields
- **Relationship Indexes**: Fast relationship traversal

## Security Architecture

### Access Control

The SDK implements role-based access control:

```typescript
interface AccessContext {
  userId: string;
  roles: string[];
  permissions: string[];
}
```

### Data Validation

All data undergoes rigorous validation:

```
Input Data
    ↓
TypeScript Type Checking
    ↓
Zod Schema Validation
    ↓
Business Rule Validation
    ↓
Sanitization
    ↓
Database Storage
```

### Audit Trail

All operations are logged for audit purposes:

```typescript
interface AuditLog {
  operation: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  changes?: Record<string, unknown>;
}
```

## Error Handling Architecture

### Error Types

The SDK defines a comprehensive error hierarchy:

```typescript
class GraphError extends Error {
  constructor(message: string, public code: string, public statusCode: number) {
    super(message);
  }
}

class ValidationError extends GraphError { }
class NotFoundError extends GraphError { }
class RelationshipError extends GraphError { }
class TraversalError extends GraphError { }
```

### Error Propagation

Errors are consistently propagated through the call stack:

```
API Error
    ↓
HTTP Status Code Mapping
    ↓
Error Type Classification
    ↓
Structured Error Response
    ↓
Client Error Handling
```

## Extensibility Architecture

### Plugin System

The SDK supports extensions through plugins:

```typescript
interface GraphPlugin {
  name: string;
  version: string;
  install(graph: GraphService): void;
  uninstall?(graph: GraphService): void;
}
```

### Custom Traversal Algorithms

Developers can implement custom traversal algorithms:

```typescript
interface TraversalAlgorithm {
  name: string;
  traverse(request: TraversalRequest): Promise<TraversalResult>;
}
```

### Custom Query Builders

The query builder system is extensible:

```typescript
interface CustomQueryBuilder<T> extends QueryBuilder<T> {
  customMethod(params: unknown): this;
}
```

## Testing Architecture

### Unit Testing

- **Mock HTTP Client**: Isolated testing of business logic
- **Schema Validation Testing**: Comprehensive input validation testing
- **Query Builder Testing**: Fluent interface behavior verification

### Integration Testing

- **API Endpoint Testing**: Real backend interaction testing
- **Traversal Testing**: Complex graph navigation testing
- **Performance Testing**: Load and scalability testing

### Contract Testing

- **API Contract Testing**: Ensuring API compatibility
- **Schema Contract Testing**: Type safety verification
- **Behavior Contract Testing**: Expected behavior validation

This architecture ensures the Graph SDK is robust, performant, and extensible while providing a clean, type-safe interface for complex graph operations.
