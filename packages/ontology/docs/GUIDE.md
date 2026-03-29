# Developer Guide

This guide covers advanced usage patterns, best practices, and common scenarios when working with the Frontal Models SDK.

## Table of Contents

- [Advanced Model Definition](#advanced-model-definition)
- [Migration Strategies](#migration-strategies)
- [Validation Rules](#validation-rules)
- [Model Mixins](#model-mixins)
- [AI-Powered Generation](#ai-powered-generation)
- [Multi-Substrate Architecture](#multi-substrate-architecture)
- [Performance Optimization](#performance-optimization)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Model Operations](#testing-model-operations)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Advanced Model Definition

### Complex Field Types

Leverage the full range of field types for sophisticated models:

```typescript
const advancedModel = await ontology.create({
  name: "product",
  fields: {
    id: {
      type: "uuid",
      primary: true,
      required: true
    },
    name: {
      type: "string",
      required: true,
      cache: { ttl: "1h" } // Cache frequently accessed fields
    },
    price: {
      type: "currency",
      required: true,
      substrate: "postgresql-main" // Route to specific substrate
    },
    tags: {
      type: "array",
      items: "string",
      default: [] // Default values
    },
    category: {
      type: "enum",
      enum: ["electronics", "clothing", "books", "home"],
      required: true
    },
    searchVector: {
      type: "vector",
      dimensions: 1536, // For embeddings
      substrate: "weaviate-vectors" // Vector database
    },
    metadata: {
      type: "json",
      computed: true,
      derivedBy: "category,brand,tags" // Computed from other fields
    },
    rating: {
      type: "float",
      default: 0.0,
      unique: false
    },
    isActive: {
      type: "boolean",
      default: true,
      index: true // Create index for boolean field
    }
  }
});
```

### Sophisticated Relationships

Model complex relationships with proper constraints:

```typescript
const orderModel = await ontology.create({
  name: "order",
  fields: {
    id: { type: "uuid", primary: true },
    orderNumber: { type: "string", unique: true },
    total: { type: "currency", required: true },
    status: { 
      type: "enum", 
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending"
    }
  },
  relationships: {
    customer: {
      type: "belongsTo",
      targetEntity: "user",
      foreignKey: "customerId",
      cascade: {
        delete: "restrict", // Prevent deletion if orders exist
        update: "cascade" // Update customer ID when customer changes
      }
    },
    items: {
      type: "hasMany",
      targetEntity: "order_item",
      cascade: {
        delete: "cascade" // Delete items when order is deleted
      }
    },
    shippingAddress: {
      type: "hasOne",
      targetEntity: "address",
      substrate: "postgresql-replica" // Use read replica for address lookups
    },
    payments: {
      type: "manyToMany",
      targetEntity: "payment",
      computed: {
        total: "SUM(items.amount)" // Computed relationship field
      }
    }
  }
});
```

### Strategic Indexing

Optimize query performance with intelligent indexing:

```typescript
const blogModel = await ontology.create({
  name: "blog_post",
  fields: {
    id: { type: "uuid", primary: true },
    title: { type: "string", required: true },
    slug: { type: "string", unique: true },
    content: { type: "text", required: true },
    authorId: { type: "uuid", required: true },
    publishedAt: { type: "timestamp" },
    tags: { type: "array", items: "string" }
  },
  indexes: [
    // Primary search index
    {
      name: "idx_search",
      fields: ["title", "content"],
      type: "gin", // Full-text search index
      substrate: "postgresql-main"
    },
    // Author lookup index
    {
      name: "idx_author",
      fields: ["authorId", "publishedAt"],
      type: "btree"
    },
    // Tag filtering index
    {
      name: "idx_tags",
      fields: ["tags"],
      type: "gin" // Array index
    },
    // Unique slug index
    {
      name: "idx_slug_unique",
      fields: ["slug"],
      unique: true,
      type: "btree"
    }
  ]
});
```

## Migration Strategies

### Zero-Downtime Migrations

Implement seamless schema updates:

```typescript
// Plan a complex migration
const migrationPlan = await ontology.migrations.plan({
  modelId: "user",
  changes: [{
    name: "user",
    fields: {
      // Add new field with default
      avatar: {
        type: "string",
        optional: true,
        default: null
      },
      // Modify existing field
      email: {
        type: "string",
        required: true,
        unique: true,
        description: "Updated email field with better validation"
      }
    },
    relationships: {
      // Add new relationship
      profile: {
        type: "hasOne",
        targetEntity: "user_profile",
        cascade: {
          delete: "cascade"
        }
      }
    }
  }]
});

// Review migration plan
console.log("Migration risk level:", migrationPlan.riskLevel);
console.log("Estimated downtime:", migrationPlan.estimatedDowntime);
console.log("Changes:", migrationPlan.changes);

// Apply with zero-downtime strategy
const result = await ontology.migrations.apply(migrationPlan.id, "zero-downtime");
console.log(`Migration applied at ${result.appliedAt}`);
```

### Blue-Green Deployment

Implement blue-green deployment for critical migrations:

```typescript
class BlueGreenMigration {
  async executeMigration(planId: string) {
    // Phase 1: Create green environment
    const greenPlan = await this.createGreenEnvironment(planId);
    
    // Phase 2: Validate green environment
    const validation = await this.validateGreenEnvironment(greenPlan);
    if (!validation.success) {
      throw new Error(`Green environment validation failed: ${validation.errors}`);
    }
    
    // Phase 3: Switch traffic to green
    const switchResult = await this.switchTraffic("green");
    console.log(`Traffic switched to green: ${switchResult.timestamp}`);
    
    // Phase 4: Monitor and rollback if needed
    const monitoring = await this.monitorGreenEnvironment();
    if (monitoring.errorRate > 0.01) {
      await this.rollbackToBlue();
      throw new Error("High error rate detected, rolled back to blue");
    }
    
    // Phase 5: Promote green to blue
    await this.promoteGreenToBlue();
    console.log("Migration completed successfully");
  }
}
```

### Rollback Strategies

Implement safe rollback procedures:

```typescript
async function safeRollback(migrationId: string) {
  try {
    // Get migration details
    const migrationHistory = await ontology.migrations.history();
    const migration = migrationHistory.data.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }
    
    // Create rollback plan
    const rollbackPlan = await ontology.migrations.plan({
      modelId: migration.modelId,
      changes: [{
        // Reverse the changes
        name: migration.modelId,
        fields: migration.fromVersion.fields,
        relationships: migration.fromVersion.relationships
      }]
    });
    
    // Execute rollback
    const rollbackResult = await ontology.migrations.rollback(migrationId);
    console.log(`Rollback completed at ${rollbackResult.rolledBackAt}`);
    
    // Verify rollback
    const verification = await verifyModelIntegrity(migration.modelId);
    if (!verification.valid) {
      throw new Error("Rollback verification failed");
    }
    
    return rollbackResult;
    
  } catch (error) {
    console.error("Rollback failed:", error);
    // Notify administrators
    await notifyAdmins("Migration rollback failed", error);
    throw error;
  }
}
```

## Validation Rules

### Complex Validation Logic

Implement sophisticated business rules:

```typescript
// Email validation with domain checking
await ontology.rules.create({
  name: "business-email-validation",
  description: "Validates business email format and domain",
  entityTypes: ["user"],
  condition: `
    email matches /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ AND
    (email endsWith '@company.com' OR 
     email endsWith '@enterprise.org' OR
     email endsWith '@business.net')
  `,
  action: "validate",
  severity: "error"
});

// Data quality validation
await ontology.rules.create({
  name: "data-completeness",
  description: "Ensures required profile data is complete",
  entityTypes: ["user"],
  condition: `
    (profile.firstName IS NOT NULL AND 
     profile.lastName IS NOT NULL AND 
     profile.phone IS NOT NULL) OR
    userType = 'guest'
  `,
  action: "validate",
  severity: "warning"
});

// Transform rules for data normalization
await ontology.rules.create({
  name: "phone-normalization",
  description: "Normalizes phone numbers to standard format",
  entityTypes: ["user", "contact"],
  condition: "phone IS NOT NULL",
  action: "transform",
  severity: "info"
});
```

### Rule Evaluation and Monitoring

Monitor rule effectiveness:

```typescript
async function evaluateRulePerformance() {
  // Evaluate rules against sample data
  const evaluation = await ontology.rules.evaluate({
    entityTypes: ["user"],
    sample: 1000 // Sample 1000 records
  });
  
  console.log("Rule Evaluation Results:");
  console.log("Total evaluated:", evaluation.summary.totalEvaluated);
  console.log("Violations found:", evaluation.summary.violations);
  console.log("Rule performance:", evaluation.summary.rulePerformance);
  
  // Identify problematic rules
  const problematicRules = evaluation.results.filter(result => 
    result.violations > result.evaluations * 0.05 // More than 5% violation rate
  );
  
  if (problematicRules.length > 0) {
    console.warn("Rules with high violation rates:", problematicRules);
    await notifyDataQualityTeam(problematicRules);
  }
  
  return evaluation;
}
```

## Model Mixins

### Creating Reusable Components

Build reusable model components:

```typescript
// Timestamp mixin for audit trails
await ontology.mixins.create({
  name: "audit-trail",
  description: "Adds audit trail fields to any entity",
  fields: {
    createdAt: {
      type: "timestamp",
      auto: true,
      description: "When the record was created"
    },
    updatedAt: {
      type: "timestamp",
      auto: true,
      description: "When the record was last updated"
    },
    createdBy: {
      type: "uuid",
      optional: true,
      description: "User who created the record"
    },
    updatedBy: {
      type: "uuid",
      optional: true,
      description: "User who last updated the record"
    },
    version: {
      type: "integer",
      default: 1,
      description: "Record version for optimistic locking"
    }
  },
  appliesTo: ["user", "order", "product", "blog_post"]
});

// Soft delete mixin
await ontology.mixins.create({
  name: "soft-delete",
  description: "Adds soft delete capability",
  fields: {
    deletedAt: {
      type: "timestamp",
      optional: true,
      description: "When the record was soft deleted"
    },
    deletedBy: {
      type: "uuid",
      optional: true,
      description: "User who deleted the record"
    },
    deleteReason: {
      type: "string",
      optional: true,
      description: "Reason for deletion"
    }
  },
  appliesTo: ["user", "comment", "review"]
});

// SEO-friendly slug mixin
await ontology.mixins.create({
  name: "sluggable",
  description: "Adds SEO-friendly slug generation",
  fields: {
    slug: {
      type: "string",
      unique: true,
      computed: true,
      derivedBy: "title",
      description: "SEO-friendly URL slug"
    }
  },
  appliesTo: ["blog_post", "page", "product"]
});
```

### Using Mixins in Models

Apply mixins to create feature-rich models:

```typescript
const enhancedUserModel = await ontology.create({
  name: "user",
  mixins: ["audit-trail", "soft-delete"],
  fields: {
    id: { type: "uuid", primary: true },
    email: { type: "string", required: true, unique: true },
    name: { type: "string", required: true },
    profile: { type: "json", optional: true }
  },
  relationships: {
    posts: { type: "hasMany", targetEntity: "blog_post" },
    orders: { type: "hasMany", targetEntity: "order" }
  }
});

const blogPostModel = await ontology.create({
  name: "blog_post",
  mixins: ["audit-trail", "sluggable"],
  fields: {
    id: { type: "uuid", primary: true },
    title: { type: "string", required: true },
    content: { type: "text", required: true },
    excerpt: { type: "string", optional: true },
    authorId: { type: "uuid", required: true }
  },
  relationships: {
    author: { type: "belongsTo", targetEntity: "user" },
    comments: { type: "hasMany", targetEntity: "comment" }
  }
});
```

## AI-Powered Generation

### Natural Language Model Generation

Generate models from descriptions:

```typescript
async function generateModelFromDescription(description: string, context: any = {}) {
  try {
    const generation = await ontology.generation.generate(description, {
      context: {
        existingModels: ["user", "product", "category"],
        ...context
      },
      substrates: ["postgresql-main", "weaviate-vectors"]
    });
    
    console.log(`Generated model with confidence: ${generation.confidence}`);
    console.log("Reasoning:", generation.reasoning);
    
    // Review generated model
    const validation = await ontology.validate(generation.proposal);
    if (!validation.valid) {
      console.warn("Generated model has validation issues:", validation.errors);
      // Optionally request regeneration with feedback
      return await generateModelWithFeedback(description, validation.errors);
    }
    
    // Create the model
    const createdModel = await ontology.create(generation.proposal);
    console.log(`Created model: ${createdModel.name}`);
    
    return createdModel;
    
  } catch (error) {
    console.error("Model generation failed:", error);
    throw error;
  }
}

// Example usage
const productModel = await generateModelFromDescription(
  "E-commerce product with inventory tracking, pricing, categories, and customer reviews"
);

const orderModel = await generateModelFromDescription(
  "Customer order with multiple items, shipping addresses, payment methods, and order tracking",
  {
    existingModels: ["user", "product", "address"]
  }
);
```

### Pattern-Based Inference

Infer models from existing data patterns:

```typescript
async function inferModelsFromData() {
  try {
    const inference = await ontology.generation.infer({
      substrates: ["postgresql-main", "clickhouse-analytics"],
      confidence: "high",
      merge: true // Merge similar suggestions
    });
    
    console.log("Inference results:");
    inference.proposals.forEach((proposal, index) => {
      console.log(`Proposal ${index + 1}:`);
      console.log(`  Model: ${proposal.modelName}`);
      console.log(`  Confidence: ${proposal.confidence}`);
      console.log(`  Reasoning: ${proposal.reasoning}`);
      console.log(`  Fields: ${JSON.stringify(proposal.fields, null, 2)}`);
    });
    
    // Auto-accept high-confidence proposals
    const highConfidenceProposals = inference.proposals.filter(p => p.confidence > 0.8);
    
    for (const proposal of highConfidenceProposals) {
      try {
        await ontology.create(proposal.modelDefinition);
        console.log(`Auto-accepted model: ${proposal.modelName}`);
      } catch (error) {
        console.error(`Failed to create model ${proposal.modelName}:`, error);
      }
    }
    
    return inference;
    
  } catch (error) {
    console.error("Model inference failed:", error);
    throw error;
  }
}
```

### Managing AI Suggestions

Handle AI-powered improvement suggestions:

```typescript
class SuggestionManager {
  async reviewSuggestions() {
    const suggestions = await ontology.generation.suggestions({
      status: "pending"
    });
    
    console.log(`Found ${suggestions.data.length} pending suggestions`);
    
    for (const suggestion of suggestions.data) {
      const decision = await this.evaluateSuggestion(suggestion);
      
      if (decision.action === "accept") {
        await this.acceptSuggestion(suggestion.id, decision.reason);
        console.log(`Accepted suggestion: ${suggestion.title}`);
      } else if (decision.action === "reject") {
        await this.rejectSuggestion(suggestion.id, decision.reason);
        console.log(`Rejected suggestion: ${suggestion.title} - ${decision.reason}`);
      } else {
        console.log(`Deferred suggestion: ${suggestion.title}`);
      }
    }
  }
  
  async evaluateSuggestion(suggestion: any): Promise<{action: string; reason: string}> {
    // Custom evaluation logic
    if (suggestion.confidence > 0.9 && suggestion.impact === "non-breaking") {
      return { action: "accept", reason: "High confidence, low impact" };
    } else if (suggestion.confidence < 0.5) {
      return { action: "reject", reason: "Low confidence" };
    } else {
      return { action: "defer", reason: "Requires manual review" };
    }
  }
  
  async acceptSuggestion(suggestionId: string, reason: string) {
    try {
      const result = await ontology.generation.acceptSuggestion(suggestionId);
      console.log(`Suggestion accepted: ${result.appliedAt}`);
      
      // Track acceptance for future learning
      await this.trackSuggestionOutcome(suggestionId, "accepted", reason);
      
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
      throw error;
    }
  }
  
  async rejectSuggestion(suggestionId: string, reason: string) {
    try {
      const result = await ontology.generation.rejectSuggestion(suggestionId, reason);
      console.log(`Suggestion rejected: ${result.rejectedAt}`);
      
      // Track rejection for future learning
      await this.trackSuggestionOutcome(suggestionId, "rejected", reason);
      
    } catch (error) {
      console.error("Failed to reject suggestion:", error);
      throw error;
    }
  }
}
```

## Multi-Substrate Architecture

### Strategic Substrate Routing

Optimize performance with intelligent substrate routing:

```typescript
const analyticsModel = await ontology.create({
  name: "analytics_event",
  substrates: {
    // Primary operational database
    operational: "postgresql-main",
    
    // Analytics warehouse for complex queries
    analytical: "clickhouse-analytics",
    
    // Vector database for similarity search
    semantic: "weaviate-vectors",
    
    // Cache for frequently accessed events
    cache: "redis-sessions"
  },
  fields: {
    id: { type: "uuid", primary: true },
    eventType: { type: "string", required: true },
    userId: { type: "uuid", substrate: "postgresql-main" },
    sessionId: { type: "string", substrate: "redis-sessions" },
    timestamp: { type: "timestamp", required: true },
    properties: { type: "json", substrate: "clickhouse-analytics" },
    embedding: { 
      type: "vector", 
      dimensions: 1536,
      substrate: "weaviate-vectors" 
    },
    metadata: { type: "json", substrate: "postgresql-main" }
  },
  indexes: [
    { 
      fields: ["eventType", "timestamp"], 
      substrate: "clickhouse-analytics" 
    },
    { 
      fields: ["userId", "timestamp"], 
      substrate: "postgresql-main" 
    }
  ]
});
```

### Cross-Substrate Queries

Implement intelligent query routing:

```typescript
class SubstrateRouter {
  async queryEvents(query: {
    eventType?: string;
    userId?: string;
    timeRange?: { start: string; end: string };
    includeSemantic?: boolean;
  }) {
    const queries = [];
    
    // Operational query for recent events
    if (query.userId || query.eventType) {
      queries.push({
        substrate: "postgresql-main",
        conditions: {
          ...(query.userId && { userId: query.userId }),
          ...(query.eventType && { eventType: query.eventType }),
          ...(query.timeRange && {
            timestamp: {
              gte: query.timeRange.start,
              lte: query.timeRange.end
            }
          })
        },
        limit: 1000
      });
    }
    
    // Analytical query for aggregations
    if (query.timeRange) {
      queries.push({
        substrate: "clickhouse-analytics",
        conditions: {
          timestamp: {
            gte: query.timeRange.start,
            lte: query.timeRange.end
          }
        },
        aggregations: ["COUNT(*)", "AVG(properties.value)"],
        groupBy: ["eventType"]
      });
    }
    
    // Semantic search for similar events
    if (query.includeSemantic && query.eventType) {
      queries.push({
        substrate: "weaviate-vectors",
        search: {
          type: "semantic",
          query: query.eventType,
          threshold: 0.8
        }
      });
    }
    
    // Execute queries in parallel
    const results = await Promise.all(
      queries.map(q => this.executeQuery(q))
    );
    
    return this.mergeResults(results);
  }
  
  private mergeResults(results: any[]): any {
    // Combine results from different substrates
    return {
      operational: results.find(r => r.substrate === "postgresql-main"),
      analytical: results.find(r => r.substrate === "clickhouse-analytics"),
      semantic: results.find(r => r.substrate === "weaviate-vectors")
    };
  }
}
```

## Performance Optimization

### Intelligent Caching

Implement multi-level caching strategies:

```typescript
class ModelCache {
  private schemaCache = new Map<string, { model: Model; expiry: number }>();
  private validationCache = new Map<string, { result: any; expiry: number }>();
  
  async getCachedModel(modelName: string): Promise<Model | null> {
    const cached = this.schemaCache.get(modelName);
    if (cached && Date.now() < cached.expiry) {
      return cached.model;
    }
    
    // Fetch from API
    const model = await ontology.model(modelName).get();
    
    // Cache for 5 minutes
    this.schemaCache.set(modelName, {
      model,
      expiry: Date.now() + 5 * 60 * 1000
    });
    
    return model;
  }
  
  async validateWithCache(
    modelName: string, 
    data: any
  ): Promise<{ valid: boolean; errors?: any[] }> {
    const cacheKey = `${modelName}:${JSON.stringify(data)}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }
    
    // Perform validation
    const result = await ontology.model(modelName).validateData();
    
    // Cache validation result for 1 minute
    this.validationCache.set(cacheKey, {
      result,
      expiry: Date.now() + 60 * 1000
    });
    
    return result;
  }
}
```

### Batch Operations

Optimize performance with batch processing:

```typescript
class BatchModelOperations {
  async createModelsBatch(modelDefinitions: ModelDefinition[]): Promise<{
    successful: Model[];
    failed: Array<{ definition: ModelDefinition; error: Error }>;
  }> {
    const batchSize = 10;
    const results = { successful: [], failed: [] };
    
    for (let i = 0; i < modelDefinitions.length; i += batchSize) {
      const batch = modelDefinitions.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (definition) => {
        try {
          const model = await ontology.create(definition);
          return { success: true, model };
        } catch (error) {
          return { success: false, error, definition };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Separate successful and failed
      batchResults.forEach(result => {
        if (result.success) {
          results.successful.push(result.model);
        } else {
          results.failed.push({
            definition: result.definition,
            error: result.error
          });
        }
      });
      
      // Add delay between batches to prevent overwhelming the API
      if (i + batchSize < modelDefinitions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}
```

## Error Handling Patterns

### Comprehensive Error Handling

Implement robust error handling:

```typescript
class ModelOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public modelName: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "ModelOperationError";
  }
}

async function safeModelOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  modelName: string,
  retries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Handle different error types
      if (error.name === "ValidationError") {
        throw new ModelOperationError(
          `Validation failed for ${modelName}: ${error.message}`,
          operationName,
          modelName,
          error
        );
      }
      
      if (error.name === "MigrationError") {
        throw new ModelOperationError(
          `Migration failed for ${modelName}: ${error.message}`,
          operationName,
          modelName,
          error
        );
      }
      
      // Retry on network errors
      if (error.name === "NetworkError" && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Unknown error - don't retry
      throw new ModelOperationError(
        `Unexpected error in ${operationName} for ${modelName}: ${error.message}`,
        operationName,
        modelName,
        error
      );
    }
  }
  
  throw new Error("Max retries exceeded");
}
```

### Circuit Breaker Pattern

Implement circuit breaker for resilience:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker();

async function resilientModelOperation() {
  return await circuitBreaker.execute(async () => {
    return await ontology.create(modelDefinition);
  });
}
```

## Testing Model Operations

### Comprehensive Unit Testing

Test all aspects of model operations:

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("Model Operations", () => {
  let mockModels: OntologyService;
  
  beforeEach(() => {
    mockModels = {
      create: mock(() => Promise.resolve({ id: "test-model", name: "test" })),
      validate: mock(() => Promise.resolve({ valid: true })),
      model: () => ({
        get: mock(() => Promise.resolve({ id: "test", fields: {} })),
        update: mock(() => Promise.resolve({ id: "test", fields: {} }))
      })
    } as any;
  });
  
  describe("Model Creation", () => {
    it("should create a valid model", async () => {
      const definition = {
        name: "test",
        fields: { id: { type: "uuid", primary: true } }
      };
      
      const model = await mockModels.create(definition);
      
      expect(model.id).toBe("test-model");
      expect(model.name).toBe("test");
    });
    
    it("should reject invalid model", async () => {
      const invalidDefinition = {
        name: "", // Invalid empty name
        fields: {}
      };
      
      await expect(mockModels.create(invalidDefinition))
        .rejects.toThrow("Model name is required");
    });
  });
  
  describe("Model Validation", () => {
    it("should validate correct model", async () => {
      const validDefinition = {
        name: "valid",
        fields: { id: { type: "uuid", primary: true } }
      };
      
      const result = await mockModels.validate(validDefinition);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
    
    it("should identify validation errors", async () => {
      const invalidDefinition = {
        name: "invalid",
        fields: {
          email: { type: "invalid-type" } // Invalid field type
        }
      };
      
      const result = await mockModels.validate(invalidDefinition);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid-type");
    });
  });
});
```

### Integration Testing

Test real API interactions:

```typescript
describe("Model Integration Tests", () => {
  let testModels: OntologyService;
  let createdModels: string[] = [];
  
  beforeAll(async () => {
    // Setup test client with test API key
    testModels = new OntologyService(createTestHttpClient());
  });
  
  afterAll(async () => {
    // Cleanup created models
    for (const modelId of createdModels) {
      try {
        await testModels.model(modelId).delete(true);
      } catch (error) {
        console.warn(`Failed to cleanup model ${modelId}:`, error);
      }
    }
  });
  
  it("should create and retrieve model", async () => {
    const definition = {
      name: `integration-test-${Date.now()}`,
      fields: {
        id: { type: "uuid", primary: true },
        name: { type: "string", required: true }
      }
    };
    
    // Create model
    const created = await testModels.create(definition);
    createdModels.push(created.id);
    
    // Retrieve model
    const retrieved = await testModels.model(created.name).get();
    
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe(created.name);
    expect(retrieved.fields).toEqual(definition.fields);
  });
  
  it("should handle model updates", async () => {
    const model = await testModels.create({
      name: `update-test-${Date.now()}`,
      fields: { name: { type: "string", required: true } }
    });
    createdModels.push(model.id);
    
    // Update model
    const updated = await testModels.model(model.name).update({
      fields: {
        ...model.fields,
        description: { type: "string", optional: true }
      }
    });
    
    expect(updated.fields.description).toBeDefined();
    
    // Verify update persisted
    const retrieved = await testModels.model(model.name).get();
    expect(retrieved.fields.description).toBeDefined();
  });
});
```

## Common Use Cases

### E-commerce Platform

Build a complete e-commerce data model:

```typescript
// Product catalog with variants and inventory
const productModel = await ontology.create({
  name: "product",
  mixins: ["audit-trail", "soft-delete"],
  fields: {
    id: { type: "uuid", primary: true },
    sku: { type: "string", unique: true, required: true },
    name: { type: "string", required: true },
    description: { type: "text" },
    price: { type: "currency", required: true },
    comparePrice: { type: "currency" },
    cost: { type: "currency" },
    weight: { type: "float" },
    dimensions: { 
      type: "json", 
      default: { length: 0, width: 0, height: 0 }
    },
    images: { type: "array", items: "string" },
    tags: { type: "array", items: "string" },
    category: { type: "string", required: true },
    brand: { type: "string" },
    isActive: { type: "boolean", default: true },
    metadata: { type: "json" }
  },
  relationships: {
    category: { type: "belongsTo", targetEntity: "category" },
    brand: { type: "belongsTo", targetEntity: "brand" },
    variants: { type: "hasMany", targetEntity: "product_variant" },
    reviews: { type: "hasMany", targetEntity: "review" },
    inventory: { type: "hasOne", targetEntity: "inventory" }
  },
  indexes: [
    { fields: ["sku"], unique: true },
    { fields: ["category", "isActive"] },
    { fields: ["brand", "price"] },
    { fields: ["tags"], type: "gin" }
  ]
});

// Order management system
const orderModel = await ontology.create({
  name: "order",
  mixins: ["audit-trail"],
  fields: {
    id: { type: "uuid", primary: true },
    orderNumber: { type: "string", unique: true },
    customerId: { type: "uuid", required: true },
    status: { 
      type: "enum", 
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending"
    },
    subtotal: { type: "currency", required: true },
    tax: { type: "currency", default: 0 },
    shipping: { type: "currency", default: 0 },
    total: { type: "currency", required: true },
    currency: { type: "string", default: "USD" },
    shippingAddress: { type: "json", required: true },
    billingAddress: { type: "json" },
    notes: { type: "text" },
    estimatedDelivery: { type: "timestamp" }
  },
  relationships: {
    customer: { type: "belongsTo", targetEntity: "user" },
    items: { type: "hasMany", targetEntity: "order_item" },
    shipments: { type: "hasMany", targetEntity: "shipment" },
    payments: { type: "hasMany", targetEntity: "payment" }
  }
});
```

### Content Management System

Build a flexible CMS with versioning:

```typescript
// Content with versioning and workflow
const contentModel = await ontology.create({
  name: "content",
  mixins: ["audit-trail", "sluggable"],
  fields: {
    id: { type: "uuid", primary: true },
    type: { 
      type: "enum", 
      enum: ["page", "post", "article", "news"],
      required: true 
    },
    title: { type: "string", required: true },
    slug: { type: "string", unique: true },
    content: { type: "text" },
    excerpt: { type: "string" },
    featuredImage: { type: "string" },
    authorId: { type: "uuid", required: true },
    status: { 
      type: "enum", 
      enum: ["draft", "review", "published", "archived"],
      default: "draft"
    },
    publishedAt: { type: "timestamp" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    tags: { type: "array", items: "string" },
    category: { type: "string" },
    metadata: { type: "json" }
  },
  relationships: {
    author: { type: "belongsTo", targetEntity: "user" },
    category: { type: "belongsTo", targetEntity: "category" },
    versions: { type: "hasMany", targetEntity: "content_version" },
    comments: { type: "hasMany", targetEntity: "comment" }
  },
  indexes: [
    { fields: ["slug"], unique: true },
    { fields: ["type", "status"] },
    { fields: ["authorId", "publishedAt"] },
    { fields: ["tags"], type: "gin" }
  ]
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Migration Failures**
   - Check model dependencies before migration
   - Use zero-downtime strategy for production
   - Verify rollback procedures are in place

2. **Validation Rule Conflicts**
   - Review rule precedence order
   - Test rules with sample data
   - Monitor rule performance impact

3. **AI Generation Quality**
   - Provide clear, specific descriptions
   - Include existing model context
   - Review generated models before acceptance

4. **Performance Issues**
   - Optimize indexes for query patterns
   - Use appropriate substrate routing
   - Implement caching strategies

### Debugging Tools

```typescript
class ModelDebugger {
  async analyzeModelPerformance(modelName: string) {
    const model = await ontology.model(modelName).get();
    
    console.log(`Model Analysis: ${modelName}`);
    console.log(`Fields: ${Object.keys(model.fields).length}`);
    console.log(`Relationships: ${Object.keys(model.relationships || {}).length}`);
    console.log(`Indexes: ${model.indexes?.length || 0}`);
    
    // Check for potential issues
    const issues = [];
    
    // Check for missing indexes
    if (model.fields.createdAt && !model.indexes?.some(idx => idx.fields.includes("createdAt"))) {
      issues.push("Missing index on createdAt field");
    }
    
    // Check for unoptimized relationships
    Object.entries(model.relationships || {}).forEach(([name, rel]) => {
      if (rel.type === "hasMany" && !rel.foreignKey) {
        issues.push(`hasMany relationship ${name} missing foreign key`);
      }
    });
    
    if (issues.length > 0) {
      console.warn("Potential issues found:", issues);
    }
    
    return { model, issues };
  }
  
  async validateModelIntegrity(modelName: string) {
    const validation = await ontology.model(modelName).validateData();
    
    console.log(`Data Validation for ${modelName}:`);
    console.log(`Total checked: ${validation.totalChecked}`);
    console.log(`Violations: ${validation.violations.length}`);
    
    if (validation.violations.length > 0) {
      console.log("Violations:", validation.violations);
      
      // Group violations by type
      const grouped = validation.violations.reduce((acc, violation) => {
        const type = violation.type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log("Violation summary:", grouped);
    }
    
    return validation;
  }
}
```

This comprehensive guide provides advanced patterns and best practices for building sophisticated model management systems with the Frontal Models SDK.
