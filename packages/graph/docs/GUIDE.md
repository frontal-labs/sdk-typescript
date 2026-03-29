# Developer Guide

This guide covers advanced usage patterns, best practices, and common scenarios when working with the Frontal Graph SDK.

## Table of Contents

- [Advanced Query Patterns](#advanced-query-patterns)
- [Graph Modeling Best Practices](#graph-modeling-best-practices)
- [Performance Optimization](#performance-optimization)
- [Relationship Management](#relationship-management)
- [Traversal Strategies](#traversal-strategies)
- [Semantic Search Implementation](#semantic-search-implementation)
- [Batch Operations](#batch-operations)
- [Versioning and History](#versioning-and-history)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Graph Applications](#testing-graph-applications)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Advanced Query Patterns

### Complex Filtering

Combine multiple conditions for sophisticated queries:

```typescript
// Find active users in specific age range with specific skills
const users = await graph.entities("user").query()
  .where({
    status: "active",
    age: { gte: 25, lte: 45 },
    "skills.name": { in: ["JavaScript", "TypeScript"] }
  })
  .include("company", "skills")
  .orderBy("createdAt", "desc")
  .limit(20)
  .execute();
```

### Temporal Queries

Query data as it existed at specific points in time:

```typescript
// Get company structure as it existed 6 months ago
const historicalOrg = await graph.query({
  entityType: "employee",
  at: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  include: ["manager", "department"]
});
```

### Recursive Queries

Query hierarchical data structures:

```typescript
// Get entire organizational hierarchy
async function getFullHierarchy(managerId: string): Promise<Entity[]> {
  const hierarchy = [];
  
  async function collectReports(id: string, depth = 0) {
    if (depth > 10) return; // Prevent infinite recursion
    
    const reports = await graph.entities("employee").query()
      .where({ managerId: id })
      .execute();
    
    for (const report of reports.data) {
      hierarchy.push(report);
      await collectReports(report.id, depth + 1);
    }
  }
  
  await collectReports(managerId);
  return hierarchy;
}
```

### Aggregation Queries

Perform aggregations across graph data:

```typescript
// Count employees by department
const departmentCounts = await graph.query({
  entityType: "employee",
  include: ["department"]
});

// Process results to get counts
const counts = departmentCounts.data.reduce((acc, emp) => {
  const dept = emp.linkedEntities?.find(le => le.relation === "BELONGS_TO");
  const deptName = dept?.type === "department" ? dept.id : "unknown";
  acc[deptName] = (acc[deptName] || 0) + 1;
  return acc;
}, {});
```

## Graph Modeling Best Practices

### Entity Design

Model entities with clear boundaries and relationships:

```typescript
// Good: Clear entity separation
const user = await graph.entities("user").create({
  name: "Alice Johnson",
  email: "alice@example.com",
  profile: {
    bio: "Software engineer",
    location: "San Francisco"
  }
});

const company = await graph.entities("company").create({
  name: "TechCorp",
  industry: "Technology",
  founded: "2010"
});

// Clear relationship with metadata
await graph.entities("user").addRelationship(
  user.id,
  company.id,
  "WORKS_FOR",
  { 
    position: "Senior Engineer",
    startDate: "2022-01-15",
    weight: 1.0
  }
);
```

### Relationship Modeling

Choose appropriate relationship types and directions:

```typescript
// Bidirectional friendship
await graph.entities("user").addRelationship(user1Id, user2Id, "FRIENDS_WITH");

// Unidirectional following
await graph.entities("user").addRelationship(followerId, followingId, "FOLLOWS");

// Weighted relationships for recommendations
await graph.entities("user").addRelationship(userId, productId, "BOUGHT", {
  weight: 1.0,
  rating: 5,
  purchaseDate: new Date().toISOString()
});
```

### Schema Evolution

Plan for schema changes over time:

```typescript
// Version your entity schemas
interface UserV1 {
  name: string;
  email: string;
}

interface UserV2 {
  name: string;
  email: string;
  profile: {
    bio?: string;
    avatar?: string;
  };
}

// Migration strategy
async function migrateUserV1ToV2(userId: string) {
  const user = await graph.entities("user").get(userId);
  const currentData = user.data as UserV1;
  
  const migratedData: UserV2 = {
    ...currentData,
    profile: {
      bio: currentData.name, // Migrate name to bio as example
    }
  };
  
  return await graph.entities("user").update(userId, migratedData);
}
```

## Performance Optimization

### Efficient Querying

Use indexes and query optimization:

```typescript
// Use indexed fields for filtering
const fastQuery = await graph.entities("user").query()
  .where({ email: "alice@example.com" }) // Indexed field
  .first();

// Avoid expensive operations in filters
// Bad: Complex nested conditions
const slowQuery = await graph.entities("user").query()
  .where({
    "skills.name": { in: largeSkillArray },
    "experience.company.name": { contains: substring }
  });

// Good: Use relationships and separate queries
const optimizedQuery = await graph.entities("user").query()
  .where({ hasSkills: true })
  .include("skills")
  .execute();
```

### Batch Operations

Use batch operations for bulk data changes:

```typescript
// Create multiple entities efficiently
const batchOperations = users.map(userData => ({
  type: "create" as const,
  entityType: "user",
  entity: userData
}));

const result = await graph.batch(batchOperations);
console.log(`Created ${result.successful} users, ${result.failed} failed`);
```

### Pagination Implementation

Implement proper pagination for large datasets:

```typescript
async function getAllUsers(batchSize = 100): Promise<Entity[]> {
  const allUsers = [];
  let cursor: string | undefined;
  
  while (true) {
    const result = await graph.entities("user").list({
      limit: batchSize,
      cursor
    });
    
    allUsers.push(...result.data);
    
    if (!result.pagination.hasNext) break;
    cursor = result.pagination.cursor;
  }
  
  return allUsers;
}
```

### Caching Strategy

Implement intelligent caching:

```typescript
class GraphCache {
  private cache = new Map<string, { data: unknown; expiry: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }
  
  set<T>(key: string, data: T, ttlMs = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }
}

const cache = new GraphCache();

// Cached entity retrieval
async function getCachedUser(id: string): Promise<Entity> {
  const cacheKey = `user:${id}`;
  let user = await cache.get<Entity>(cacheKey);
  
  if (!user) {
    user = await graph.entities("user").get(id);
    cache.set(cacheKey, user);
  }
  
  return user;
}
```

## Relationship Management

### Bidirectional Relationships

Maintain consistency in bidirectional relationships:

```typescript
async function createFriendship(user1Id: string, user2Id: string): Promise<void> {
  // Create both directions
  await Promise.all([
    graph.entities("user").addRelationship(user1Id, user2Id, "FRIENDS_WITH"),
    graph.entities("user").addRelationship(user2Id, user1Id, "FRIENDS_WITH")
  ]);
}

async function removeFriendship(user1Id: string, user2Id: string): Promise<void> {
  // Get relationships to find the specific relationship IDs
  const [user1Rels, user2Rels] = await Promise.all([
    graph.entities("user").relationships(user1Id),
    graph.entities("user").relationships(user2Id)
  ]);
  
  const user1Rel = user1Rels.data.find(r => 
    r.id === user2Id && r.relation === "FRIENDS_WITH"
  );
  const user2Rel = user2Rels.data.find(r => 
    r.id === user1Id && r.relation === "FRIENDS_WITH"
  );
  
  // Remove both directions
  await Promise.all([
    user1Rel && graph.entities("user").removeRelationship(user1Id, user1Rel.id),
    user2Rel && graph.entities("user").removeRelationship(user2Id, user2Rel.id)
  ]);
}
```

### Relationship Weight Management

Use weights for recommendation algorithms:

```typescript
async function updateInteractionWeight(
  userId: string, 
  productId: string, 
  interactionType: 'view' | 'purchase' | 'review'
): Promise<void> {
  const weightMap = {
    view: 0.1,
    purchase: 1.0,
    review: 0.5
  };
  
  // Get existing relationship
  const relationships = await graph.entities("user").relationships(userId);
  const existingRel = relationships.data.find(r => 
    r.id === productId && r.relation === "INTERACTED_WITH"
  );
  
  if (existingRel) {
    // Update existing weight (cumulative)
    const newWeight = (existingRel.weight || 0) + weightMap[interactionType];
    // Note: This would require an update relationship API
    await graph.entities("user").addRelationship(
      userId, 
      productId, 
      "INTERACTED_WITH",
      { weight: newWeight }
    );
  } else {
    // Create new relationship
    await graph.entities("user").addRelationship(
      userId,
      productId,
      "INTERACTED_WITH",
      { weight: weightMap[interactionType] }
    );
  }
}
```

## Traversal Strategies

### Efficient Social Network Traversal

Find connections with optimal performance:

```typescript
async function findMutualFriends(userId1: string, userId2: string): Promise<Entity[]> {
  // Get friends of both users
  const [user1Friends, user2Friends] = await Promise.all([
    getFriends(userId1),
    getFriends(userId2)
  ]);
  
  // Find intersection
  const user1FriendIds = new Set(user1Friends.map(f => f.id));
  const mutualFriends = user2Friends.filter(friend => 
    user1FriendIds.has(friend.id)
  );
  
  return mutualFriends;
}

async function getFriends(userId: string): Promise<Entity[]> {
  const paths = await graph.traverse({
    startEntity: { id: userId, type: "user" },
    direction: "outgoing",
    maxDepth: 1,
    filters: { relationType: "FRIENDS_WITH" }
  });
  
  return paths.paths[0]?.map(step => step.entity) || [];
}
```

### Recommendation Path Traversal

Generate recommendations based on graph paths:

```typescript
async function generateProductRecommendations(userId: string, maxDepth = 3): Promise<Array<{product: Entity; score: number}>> {
  const recommendations = new Map<string, number>();
  
  const paths = await graph.traverse({
    startEntity: { id: userId, type: "user" },
    direction: "outgoing",
    maxDepth,
    filters: { relationType: "BOUGHT" }
  });
  
  // Score products based on path length and weights
  for (const path of paths.paths) {
    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      if (step.entity.type === "product") {
        const pathLength = i;
        const weight = step.edge.weight || 1;
        const score = weight / pathLength; // Shorter paths and higher weights score better
        
        const currentScore = recommendations.get(step.entity.id) || 0;
        recommendations.set(step.entity.id, Math.max(currentScore, score));
      }
    }
  }
  
  // Convert to sorted array
  return Array.from(recommendations.entries())
    .map(([productId, score]) => ({
      product: paths.paths.flatMap(p => p).find(s => s.entity.id === productId)?.entity!,
      score
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

## Semantic Search Implementation

### Content-Based Similarity

Implement semantic search for content discovery:

```typescript
async function findSimilarContent(
  contentId: string, 
  contentType: string,
  threshold = 0.7
): Promise<Array<{content: Entity; similarity: number}>> {
  // Get the source content
  const sourceContent = await graph.entities(contentType).get(contentId);
  
  // Perform semantic search
  const searchResults = await graph.semanticSearch({
    query: sourceContent.data.title || sourceContent.data.description,
    entityType: contentType,
    threshold,
    limit: 20
  });
  
  // Filter out the original content
  return searchResults.results
    .filter(result => result.entity.id !== contentId)
    .map(result => ({
      content: result.entity,
      similarity: result.score
    }));
}
```

### Hybrid Search Strategy

Combine semantic and traditional search:

```typescript
async function hybridSearch(
  query: string,
  entityType: string,
  options: {
    semanticWeight = 0.6;
    traditionalWeight = 0.4;
    limit = 10;
  } = {}
): Promise<Array<{entity: Entity; score: number; matchType: 'semantic' | 'traditional'}>> {
  // Perform both searches in parallel
  const [semanticResults, traditionalResults] = await Promise.all([
    graph.semanticSearch({
      query,
      entityType,
      limit: options.limit * 2 // Get more to have better selection
    }),
    graph.entities(entityType).query()
      .where({ 
        $or: [
          { title: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query } }
        ]
      })
      .limit(options.limit * 2)
      .execute()
  ]);
  
  // Combine and score results
  const combinedResults = new Map<string, {
    entity: Entity;
    semanticScore: number;
    traditionalScore: number;
  }>();
  
  // Add semantic results
  semanticResults.results.forEach(result => {
    combinedResults.set(result.entity.id, {
      entity: result.entity,
      semanticScore: result.score,
      traditionalScore: 0
    });
  });
  
  // Add traditional results
  traditionalResults.data.forEach(entity => {
    const existing = combinedResults.get(entity.id);
    if (existing) {
      existing.traditionalScore = 1; // Simple binary match for traditional
    } else {
      combinedResults.set(entity.id, {
        entity,
        semanticScore: 0,
        traditionalScore: 1
      });
    }
  });
  
  // Calculate final scores and sort
  return Array.from(combinedResults.values())
    .map(result => {
      const finalScore = 
        (result.semanticScore * options.semanticWeight) +
        (result.traditionalScore * options.traditionalWeight);
      
      return {
        entity: result.entity,
        score: finalScore,
        matchType: result.semanticScore > result.traditionalScore ? 'semantic' : 'traditional'
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit);
}
```

## Batch Operations

### Efficient Data Migration

Perform large-scale data operations efficiently:

```typescript
async function migrateUserData(
  sourceData: Array<{oldId: string; name: string; email: string}>,
  batchSize = 50
): Promise<{success: number; failed: number}> {
  let success = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < sourceData.length; i += batchSize) {
    const batch = sourceData.slice(i, i + batchSize);
    
    const operations = batch.map(user => ({
      type: "create" as const,
      entityType: "user",
      entity: {
        name: user.name,
        email: user.email,
        legacyId: user.oldId
      }
    }));
    
    try {
      const result = await graph.batch(operations);
      success += result.successful;
      failed += result.failed;
      
      // Log failed operations for retry
      if (result.failed > 0) {
        console.error("Batch failures:", result.errors);
      }
    } catch (error) {
      console.error("Batch operation failed:", error);
      failed += batch.length;
    }
    
    // Add delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { success, failed };
}
```

### Relationship Batch Creation

Create multiple relationships efficiently:

```typescript
async function createSocialNetwork(
  users: Entity[],
  connectionProbability = 0.1
): Promise<void> {
  const operations = [];
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (Math.random() < connectionProbability) {
        operations.push({
          type: "create" as const,
          entityType: "relationship",
          entity: {
            fromUserId: users[i].id,
            toUserId: users[j].id,
            type: "FRIENDS_WITH",
            createdAt: new Date().toISOString()
          }
        });
      }
    }
    
    // Process in batches to avoid memory issues
    if (operations.length >= 100) {
      await graph.batch(operations.splice(0, 100));
    }
  }
  
  // Process remaining operations
  if (operations.length > 0) {
    await graph.batch(operations);
  }
}
```

## Versioning and History

### Entity History Tracking

Track and analyze changes over time:

```typescript
async function getEntityChangeHistory(
  entityId: string,
  entityType: string,
  timeRange?: { start: string; end: string }
): Promise<Array<{version: number; changes: any; timestamp: string}>> {
  const history = await graph.history.get(entityId, entityType);
  
  let filteredHistory = history.history;
  
  if (timeRange) {
    filteredHistory = filteredHistory.filter(change => 
      change.changedAt >= timeRange.start && change.changedAt <= timeRange.end
    );
  }
  
  return filteredHistory.map(change => ({
    version: change.version,
    changes: change.changes,
    timestamp: change.changedAt
  }));
}

async function revertEntityToVersion(
  entityId: string,
  entityType: string,
  targetVersion: number,
  reason?: string
): Promise<Entity> {
  try {
    const reverted = await graph.history.revert(entityId, entityType, targetVersion);
    
    // Log the reversion
    console.log(`Reverted ${entityType} ${entityId} to version ${targetVersion}`, {
      reason: reason || "Manual reversion",
      timestamp: new Date().toISOString()
    });
    
    return reverted;
  } catch (error) {
    console.error(`Failed to revert entity ${entityId} to version ${targetVersion}:`, error);
    throw error;
  }
}
```

### Audit Trail Implementation

Create comprehensive audit logging:

```typescript
class GraphAuditor {
  async logOperation(
    operation: string,
    entityType: string,
    entityId: string,
    userId: string,
    changes?: Record<string, unknown>
  ): Promise<void> {
    const auditEntry = {
      operation,
      entityType,
      entityId,
      userId,
      changes,
      timestamp: new Date().toISOString(),
      ip: process.env.REQUEST_IP,
      userAgent: process.env.USER_AGENT
    };
    
    // Store audit entry in a separate audit collection
    await graph.entities("audit_log").create(auditEntry);
  }
  
  async getAuditTrail(
    entityId: string,
    entityType: string,
    timeRange?: { start: string; end: string }
  ): Promise<Entity[]> {
    const conditions: Record<string, unknown> = {
      entityId,
      entityType
    };
    
    if (timeRange) {
      conditions.timestamp = {
        gte: timeRange.start,
        lte: timeRange.end
      };
    }
    
    const result = await graph.entities("audit_log").query()
      .where(conditions)
      .orderBy("timestamp", "desc")
      .execute();
    
    return result.data;
  }
}

const auditor = new GraphAuditor();

// Wrap entity operations with audit logging
async function auditedEntityUpdate(
  entityType: string,
  entityId: string,
  fields: Record<string, unknown>,
  userId: string
): Promise<Entity> {
  // Get current state for comparison
  const current = await graph.entities(entityType).get(entityId);
  
  // Perform update
  const updated = await graph.entities(entityType).update(entityId, fields);
  
  // Log the operation
  await auditor.logOperation(
    "update",
    entityType,
    entityId,
    userId,
    {
      before: current.data,
      after: updated.data,
      changedFields: Object.keys(fields)
    }
  );
  
  return updated;
}
```

## Error Handling Patterns

### Robust Error Handling

Implement comprehensive error handling:

```typescript
class GraphOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public entityType: string,
    public entityId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "GraphOperationError";
  }
}

async function safeEntityOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  entityType: string,
  entityId?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Handle specific error types
    if (error.name === "NotFoundError") {
      throw new GraphOperationError(
        `Entity not found: ${entityId}`,
        operationName,
        entityType,
        entityId,
        error
      );
    }
    
    if (error.name === "ValidationError") {
      throw new GraphOperationError(
        `Validation failed: ${error.message}`,
        operationName,
        entityType,
        entityId,
        error
      );
    }
    
    // Handle network errors
    if (error.name === "NetworkError" || error.code === "ECONNREFUSED") {
      console.warn(`Network error during ${operationName}, retrying...`);
      // Implement retry logic here
      return await retryOperation(operation, operationName);
    }
    
    // Unknown error
    throw new GraphOperationError(
      `Unexpected error during ${operationName}: ${error.message}`,
      operationName,
      entityType,
      entityId,
      error
    );
  }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Attempt ${attempt} failed for ${operationName}, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Max retries exceeded for ${operationName}`);
}
```

## Testing Graph Applications

### Unit Testing Graph Operations

Test graph operations with mocks:

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("User Management", () => {
  let mockGraph: GraphService;
  
  beforeEach(() => {
    mockGraph = {
      entities: () => ({
        create: mock(() => Promise.resolve({ id: "user-123", type: "user" })),
        get: mock(() => Promise.resolve({ id: "user-123", type: "user", data: { name: "Alice" } })),
        update: mock(() => Promise.resolve({ id: "user-123", type: "user", data: { name: "Alice Smith" } })),
        delete: mock(() => Promise.resolve())
      })
    } as any;
  });
  
  it("should create a user", async () => {
    const user = await mockGraph.entities("user").create({ name: "Alice" });
    
    expect(user.id).toBe("user-123");
    expect(user.type).toBe("user");
    expect(mockGraph.entities("user").create).toHaveBeenCalled();
  });
  
  it("should update a user", async () => {
    const updated = await mockGraph.entities("user").update("user-123", { name: "Alice Smith" });
    
    expect(updated.data.name).toBe("Alice Smith");
    expect(mockGraph.entities("user").update).toHaveBeenCalledWith("user-123", { name: "Alice Smith" });
  });
});
```

### Integration Testing

Test against real graph data:

```typescript
describe("Graph Integration Tests", () => {
  let testGraph: GraphService;
  let testEntities: { users: Entity[]; companies: Entity[] } = { users: [], companies: [] };
  
  beforeAll(async () => {
    // Setup test graph instance
    testGraph = new GraphService(testHttpClient);
    
    // Create test data
    const company = await testGraph.entities("company").create({
      name: "TestCorp",
      industry: "Technology"
    });
    testEntities.companies.push(company);
    
    const user = await testGraph.entities("user").create({
      name: "Test User",
      email: "test@example.com"
    });
    testEntities.users.push(user);
    
    // Create relationship
    await testGraph.entities("user").addRelationship(
      user.id,
      company.id,
      "WORKS_FOR"
    );
  });
  
  afterAll(async () => {
    // Cleanup test data
    for (const user of testEntities.users) {
      await testGraph.entities("user").delete(user.id);
    }
    for (const company of testEntities.companies) {
      await testGraph.entities("company").delete(company.id);
    }
  });
  
  it("should traverse user-company relationships", async () => {
    const paths = await testGraph.traverse({
      startEntity: { id: testEntities.users[0].id, type: "user" },
      direction: "outgoing",
      maxDepth: 2
    });
    
    expect(paths.totalFound).toBeGreaterThan(0);
    expect(paths.paths[0]).toHaveLength(2); // User -> Company
  });
});
```

## Common Use Cases

### Social Network Implementation

Build a complete social network feature:

```typescript
class SocialNetwork {
  constructor(private graph: GraphService) {}
  
  async createUser(profile: {
    name: string;
    email: string;
    bio?: string;
  }): Promise<Entity> {
    return await this.graph.entities("user").create(profile);
  }
  
  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    await this.graph.entities("user").addRelationship(
      fromUserId,
      toUserId,
      "FRIEND_REQUEST_SENT"
    );
  }
  
  async acceptFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    // Remove the request
    const relationships = await this.graph.entities("user").relationships(toUserId);
    const requestRel = relationships.data.find(r => 
      r.id === fromUserId && r.relation === "FRIEND_REQUEST_SENT"
    );
    
    if (requestRel) {
      await this.graph.entities("user").removeRelationship(toUserId, requestRel.id);
    }
    
    // Create bidirectional friendship
    await Promise.all([
      this.graph.entities("user").addRelationship(fromUserId, toUserId, "FRIENDS_WITH"),
      this.graph.entities("user").addRelationship(toUserId, fromUserId, "FRIENDS_WITH")
    ]);
  }
  
  async getFriendsList(userId: string): Promise<Entity[]> {
    const relationships = await this.graph.entities("user").relationships(userId);
    const friends = relationships.data
      .filter(rel => rel.relation === "FRIENDS_WITH")
      .map(rel => ({ id: rel.id, type: "user" } as Entity));
    
    return friends;
  }
  
  async getFriendsOfFriends(userId: string, maxDepth = 2): Promise<Entity[]> {
    const paths = await this.graph.traverse({
      startEntity: { id: userId, type: "user" },
      direction: "outgoing",
      maxDepth,
      filters: { relationType: "FRIENDS_WITH" }
    });
    
    // Extract unique friends of friends (excluding direct friends and self)
    const fofSet = new Set<string>();
    const directFriends = new Set<string>();
    
    for (const path of paths.paths) {
      for (let i = 0; i < path.length; i++) {
        const entity = path[i].entity;
        if (i === 0) {
          directFriends.add(entity.id); // Direct friend
        } else if (i === 1) {
          fofSet.add(entity.id); // Friend of friend
        }
      }
    }
    
    // Remove direct friends and self
    fofSet.delete(userId);
    directFriends.forEach(id => fofSet.delete(id));
    
    return Array.from(fofSet).map(id => ({ id, type: "user" } as Entity));
  }
}
```

### Content Recommendation System

Implement a sophisticated recommendation engine:

```typescript
class ContentRecommender {
  constructor(private graph: GraphService) {}
  
  async getPersonalizedRecommendations(
    userId: string,
    options: {
      contentTypes?: string[];
      maxResults?: number;
      diversityFactor?: number;
    } = {}
  ): Promise<Array<{content: Entity; score: number; reason: string}>> {
    const {
      contentTypes = ["article", "video", "podcast"],
      maxResults = 20,
      diversityFactor = 0.3
    } = options;
    
    const recommendations = new Map<string, {
      content: Entity;
      score: number;
      reasons: string[];
    }>();
    
    // 1. Content-based recommendations (similar to what user liked)
    const likedContent = await this.getUserLikedContent(userId);
    for (const content of likedContent) {
      const similar = await this.graph.semanticSearch({
        query: content.data.title + " " + content.data.description,
        entityType: content.type,
        limit: 5
      });
      
      similar.results.forEach(result => {
        const existing = recommendations.get(result.entity.id);
        const score = result.score * 0.8; // Weight for content similarity
        const reason = `Similar to "${content.data.title}"`;
        
        if (existing) {
          existing.score = Math.max(existing.score, score);
          existing.reasons.push(reason);
        } else {
          recommendations.set(result.entity.id, {
            content: result.entity,
            score,
            reasons: [reason]
          });
        }
      });
    }
    
    // 2. Collaborative filtering (what similar users liked)
    const similarUsers = await this.findSimilarUsers(userId);
    for (const similarUser of similarUsers) {
      const userContent = await this.getUserLikedContent(similarUser.id);
      userContent.forEach(content => {
        const existing = recommendations.get(content.id);
        const score = similarUser.similarity * 0.6; // Weight for collaborative filtering
        const reason = `Liked by users similar to you`;
        
        if (existing) {
          existing.score = Math.max(existing.score, score);
          existing.reasons.push(reason);
        } else {
          recommendations.set(content.id, {
            content,
            score,
            reasons: [reason]
          });
        }
      });
    }
    
    // 3. Trending content (popularity boost)
    const trendingContent = await this.getTrendingContent(contentTypes);
    trendingContent.forEach(content => {
      const existing = recommendations.get(content.id);
      const score = content.popularity * 0.4; // Weight for trending
      const reason = `Trending in ${content.type}`;
      
      if (existing) {
        existing.score = Math.max(existing.score, score);
        existing.reasons.push(reason);
      } else {
        recommendations.set(content.id, {
          content,
          score,
          reasons: [reason]
        });
      }
    });
    
    // Convert to array and apply diversity
    let results = Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score);
    
    // Apply diversity: ensure content type variety
    if (diversityFactor > 0) {
      results = this.applyDiversity(results, diversityFactor);
    }
    
    return results
      .slice(0, maxResults)
      .map(item => ({
        content: item.content,
        score: item.score,
        reason: item.reasons.join("; ")
      }));
  }
  
  private async getUserLikedContent(userId: string): Promise<Entity[]> {
    const paths = await this.graph.traverse({
      startEntity: { id: userId, type: "user" },
      direction: "outgoing",
      maxDepth: 2,
      filters: { relationType: "LIKED" }
    });
    
    return paths.paths
      .flatMap(path => path)
      .filter(step => step.entity.type !== "user")
      .map(step => step.entity);
  }
  
  private async findSimilarUsers(userId: string): Promise<Array<{id: string; similarity: number}>> {
    // Implementation would use semantic search or collaborative filtering
    return [];
  }
  
  private async getTrendingContent(contentTypes: string[]): Promise<Array<{id: string; type: string; popularity: number}>> {
    // Implementation would query content with engagement metrics
    return [];
  }
  
  private applyDiversity(
    recommendations: Array<{content: Entity; score: number}>,
    diversityFactor: number
  ): Array<{content: Entity; score: number}> {
    const diversified = [];
    const typeCounts = new Map<string, number>();
    
    for (const rec of recommendations) {
      const type = rec.content.type;
      const count = typeCounts.get(type) || 0;
      
      // Reduce score based on type frequency
      const diversityPenalty = count * diversityFactor;
      const adjustedScore = rec.score - diversityPenalty;
      
      diversified.push({
        ...rec,
        score: adjustedScore
      });
      
      typeCounts.set(type, count + 1);
    }
    
    return diversified.sort((a, b) => b.score - a.score);
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Slow Query Performance**
   - Use indexed fields in filters
   - Limit traversal depth
   - Implement proper pagination
   - Use batch operations for bulk data

2. **Memory Issues with Large Graphs**
   - Process data in streams
   - Use cursor-based pagination
   - Limit result set sizes
   - Implement proper cleanup

3. **Relationship Consistency**
   - Use transactions for related operations
   - Implement bidirectional relationship maintenance
   - Add validation for relationship constraints

4. **Semantic Search Quality**
   - Improve content quality and descriptions
   - Use appropriate search thresholds
   - Combine with traditional search for better results

### Debugging Tools

```typescript
class GraphDebugger {
  async analyzeQueryPerformance(
    query: GraphQuery,
    iterations = 10
  ): Promise<{avgTime: number; minTime: number; maxTime: number}> {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.graph.query(query);
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return { avgTime, minTime, maxTime };
  }
  
  async visualizeGraph(
    startEntityId: string,
    maxDepth = 2
  ): Promise<{nodes: any[]; edges: any[]}> {
    const paths = await this.graph.traverse({
      startEntity: { id: startEntityId, type: "any" },
      direction: "both",
      maxDepth
    });
    
    const nodes = new Set();
    const edges = [];
    
    paths.paths.forEach(path => {
      for (let i = 0; i < path.length; i++) {
        const step = path[i];
        nodes.add(JSON.stringify(step.entity));
        
        if (step.edge) {
          edges.push({
            from: step.edge.fromEntity.id,
            to: step.edge.toEntity.id,
            type: step.edge.relationType,
            weight: step.edge.weight
          });
        }
      }
    });
    
    return {
      nodes: Array.from(nodes).map(nodeStr => JSON.parse(nodeStr)),
      edges
    };
  }
}
```

This comprehensive guide provides advanced patterns and best practices for building sophisticated graph-based applications with the Frontal Graph SDK.
