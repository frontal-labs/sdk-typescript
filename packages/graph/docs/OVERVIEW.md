# @frontal-labs/graph

The **Frontal Graph SDK** provides a powerful and flexible interface for working with graph databases in the Frontal ecosystem. It enables you to model complex relationships, perform sophisticated queries, and traverse connected data with ease.

## Key Features

- **Graph Database Operations**: Full CRUD operations for entities and relationships
- **Complex Queries**: Advanced graph querying with filtering, sorting, and pagination
- **Natural Language Queries**: Query your graph using natural language
- **Semantic Search**: Vector-based similarity search across entities
- **Graph Traversal**: Navigate relationships and find paths between entities
- **Type Safety**: Built with TypeScript and Zod for robust validation
- **Batch Operations**: Efficient bulk operations for large datasets
- **Version History**: Track and revert entity changes over time

## Installation

```bash
bun add @frontal-labs/graph
```

## Quick Start

### Basic Entity Operations

```typescript
import { graph } from "@frontal-labs/graph";

// Create a user entity
const user = await graph.entities("user").create({
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 30
});

// Get a user by ID
const retrievedUser = await graph.entities("user").get(user.id);

// List all users with filtering
const users = await graph.entities("user").list({
  conditions: { age: { gte: 18 } },
  limit: 10
});
```

### Working with Relationships

```typescript
// Create entities
const user = await graph.entities("user").create({ name: "Alice" });
const company = await graph.entities("company").create({ name: "TechCorp" });

// Create a relationship
await graph.entities("user").addRelationship(
  user.id,
  company.id,
  "WORKS_FOR",
  { weight: 1.0 }
);

// Get relationships for an entity
const relationships = await graph.entities("user").relationships(user.id);
```

### Graph Queries

```typescript
// Complex graph query
const result = await graph.query({
  entityType: "user",
  conditions: { status: "active" },
  include: ["company", "skills"],
  orderBy: [{ field: "createdAt", direction: "desc" }],
  limit: 20
});

// Natural language query
const nlResult = await graph.naturalLanguageQuery(
  "Find all users who work at tech companies and have JavaScript skills"
);
```

### Graph Traversal

```typescript
// Traverse from a user to find connections
const paths = await graph.traverse({
  startEntity: { id: user.id, type: "user" },
  direction: "outgoing",
  maxDepth: 3,
  filters: { relationType: "KNOWS" }
});

// Find shortest path between entities
const pathResult = await graph.findPath({
  fromEntity: { id: user1.id, type: "user" },
  toEntity: { id: user2.id, type: "user" },
  algorithm: "shortest"
});
```

### Semantic Search

```typescript
// Search for similar entities
const searchResults = await graph.semanticSearch({
  query: "senior software engineer with machine learning experience",
  entityType: "user",
  limit: 10,
  threshold: 0.8
});
```

## Core Concepts

### Entities

Entities are the nodes in your graph database. Each entity has:

- **ID**: Unique identifier
- **Type**: Categorizes the entity (e.g., "user", "company")
- **Data**: Flexible JSON data store
- **Metadata**: Creation/update timestamps, version info
- **Relationships**: Connections to other entities

### Relationships

Relationships connect entities and can have:

- **Type**: Describes the relationship (e.g., "WORKS_FOR", "KNOWS")
- **Direction**: Can be outgoing, incoming, or bidirectional
- **Weight**: Optional numerical value for relationship strength
- **Properties**: Additional metadata about the relationship

### Queries

The SDK supports multiple query patterns:

- **Structured Queries**: Filter, sort, and paginate with explicit conditions
- **Natural Language Queries**: Use plain English to describe what you want
- **Semantic Search**: Find similar entities based on vector embeddings
- **Traversal Queries**: Navigate through connected entities

## Configuration

The Graph SDK automatically reads configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

Or configure programmatically:

```typescript
import { createGraphClient } from "@frontal-labs/graph";
import { FrontalClient } from "@frontal-labs/_core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const graph = createGraphClient(client);
```

## Error Handling

All operations follow a consistent error handling pattern:

```typescript
try {
  const entity = await graph.entities("user").get("invalid-id");
} catch (error) {
  if (error.name === "NotFoundError") {
    console.log("Entity not found");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Use Cases

### Social Networks

Model users, friendships, and content sharing:

```typescript
// Create friendship connections
await graph.entities("user").addRelationship(
  user1Id,
  user2Id,
  "FRIENDS_WITH"
);

// Find friends of friends
const fof = await graph.traverse({
  startEntity: { id: userId, type: "user" },
  maxDepth: 2,
  filters: { relationType: "FRIENDS_WITH" }
});
```

### Knowledge Graphs

Build interconnected knowledge bases:

```typescript
// Create concept relationships
await graph.entities("concept").addRelationship(
  aiConcept.id,
  mlConcept.id,
  "INCLUDES"
);

// Query related concepts
const relatedConcepts = await graph.query({
  entityType: "concept",
  include: ["related_concepts"],
  conditions: { domain: "computer_science" }
});
```

### Recommendation Engines

Power recommendation systems with graph traversal:

```typescript
// Find similar users based on connections
const similarUsers = await graph.semanticSearch({
  query: "users similar to current user preferences",
  entityType: "user",
  limit: 5
});

// Recommend products based on user connections
const recommendations = await graph.traverse({
  startEntity: { id: userId, type: "user" },
  maxDepth: 3,
  filters: { relationType: "BOUGHT" }
});
```

## Performance Considerations

- **Indexing**: Ensure frequently queried fields are indexed
- **Batch Operations**: Use batch operations for bulk data changes
- **Traversal Limits**: Set appropriate maxDepth limits to prevent expensive queries
- **Pagination**: Use cursor-based pagination for large result sets

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand the system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns and best practices
