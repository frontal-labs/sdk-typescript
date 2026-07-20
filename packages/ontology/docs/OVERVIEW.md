# @frontal-labs/ontology

The **Frontal Models SDK** provides a comprehensive system for entity schema management, database migrations, and AI-powered model generation. It enables you to define, evolve, and manage data models with type safety and intelligent automation.

## Key Features

- **Schema Management**: Define and manage entity models with rich field types and relationships
- **AI-Powered Generation**: Generate models from natural language descriptions
- **Database Migrations**: Zero-downtime migrations with rollback capabilities
- **Validation Rules**: Enforce data integrity with custom validation rules
- **Model Mixins**: Reusable model components for common patterns
- **Semantic Inference**: AI-powered suggestions for model improvements
- **Multi-Substrate Support**: Route models to different database backends
- **Version Control**: Track model evolution with full history

## Installation

```bash
bun add @frontal-labs/ontology
```

## Quick Start

### Define a Model

```typescript
import { ontology } from "@frontal-labs/ontology";

const user = await ontology.create({
  name: "user",
  displayName: "User",
  description: "Registered user accounts",
  fields: {
    id: {
      type: "uuid",
      primary: true,
      required: true
    },
    email: {
      type: "string",
      required: true,
      unique: true
    },
    name: {
      type: "string",
      required: true
    },
    age: {
      type: "integer"
    },
    profile: {
      type: "json",
      optional: true
    },
    createdAt: {
      type: "timestamp",
      auto: true
    }
  },
  relationships: {
    company: {
      type: "belongsTo",
      targetEntity: "company"
    },
    posts: {
      type: "hasMany",
      targetEntity: "post"
    }
  },
  status: "active"
});
```

### AI-Powered Model Generation

```typescript
// Generate a model from natural language
const generated = await ontology.generation.generate(
  "A blog post with title, content, author, and publication date"
);

console.log("Generated model:", generated.proposal);

// Accept the generated model
await ontology.create(generated.proposal);
```

### Database Migrations

```typescript
// Plan a migration
const plan = await ontology.migrations.plan({
  modelId: "user",
  changes: [{
    name: "user",
    fields: {
      ...existingFields,
      avatar: {
        type: "string",
        optional: true
      }
    }
  }]
});

// Apply the migration
await ontology.migrations.apply(plan.id, "zero-downtime");
```

### Validation Rules

```typescript
// Create a validation rule
await ontology.rules.create({
  name: "user-email-format",
  description: "Ensure user emails are valid",
  entityTypes: ["user"],
  condition: "email matches /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/",
  action: "validate",
  severity: "error"
});
```

## Core Concepts

### Models

Models are the foundation of your data structure:

- **Fields**: Define the structure and types of your data
- **Relationships**: Connect models to create relational schemas
- **Indexes**: Optimize query performance
- **Substrates**: Route to different database backends
- **Status**: Manage model lifecycle (draft, active, deprecated)

### Field Types

The SDK supports rich field types:

```typescript
type FieldType = 
  | "string"     // Text data
  | "integer"    // Whole numbers
  | "float"      // Decimal numbers
  | "boolean"    // True/false values
  | "uuid"       // Unique identifiers
  | "timestamp"  // Date/time values
  | "currency"   // Monetary values
  | "json"       // Flexible JSON data
  | "array"      // Arrays of values
  | "enum"       // Predefined values
  | "vector"     // Vector embeddings
  | "text"       // Large text blocks
```

### Relationships

Define connections between models:

```typescript
const relationships = {
  // One-to-one
  profile: {
    type: "hasOne",
    targetEntity: "profile"
  },
  
  // One-to-many
  posts: {
    type: "hasMany",
    targetEntity: "post"
  },
  
  // Many-to-one
  company: {
    type: "belongsTo",
    targetEntity: "company"
  },
  
  // Many-to-many
  tags: {
    type: "manyToMany",
    targetEntity: "tag"
  }
};
```

## Advanced Features

### Model Mixins

Create reusable model components:

```typescript
// Define a mixin for timestamped entities
await ontology.mixins.create({
  name: "timestamped",
  description: "Adds created/updated timestamps",
  fields: {
    createdAt: {
      type: "timestamp",
      auto: true
    },
    updatedAt: {
      type: "timestamp",
      auto: true
    }
  },
  appliesTo: ["user", "post", "comment"]
});

// Use the mixin in a model
const post = await ontology.create({
  name: "post",
  mixins: ["timestamped"],
  fields: {
    title: { type: "string", required: true },
    content: { type: "text", required: true }
  }
});
```

### Multi-Substrate Routing

Route models to different database backends:

```typescript
const user = await ontology.create({
  name: "user",
  substrates: {
    operational: "postgresql-main",
    analytical: "clickhouse-analytics",
    semantic: "weaviate-vectors",
    cache: "redis-sessions"
  },
  fields: {
    // ... field definitions
  }
});
```

### Semantic Metadata

Add semantic understanding to your models:

```typescript
const user = await ontology.create({
  name: "user",
  semantics: {
    description: "Person who uses the application",
    lifecycle: ["registered", "active", "inactive", "deleted"],
    criticalFields: ["email", "id"],
    significantEvents: ["login", "purchase", "profile_update"],
    tags: ["pii", "user-data", "authentication"]
  },
  fields: {
    // ... field definitions
  }
});
```

## Configuration

The Models SDK automatically reads configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

Or configure programmatically:

```typescript
import { createOntologyClient } from "@frontal-labs/ontology";
import { FrontalClient } from "@frontal-labs/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const ontology = createOntologyClient(client);
```

## Error Handling

All operations follow consistent error handling:

```typescript
try {
  const model = await ontology.create(definition);
} catch (error) {
  if (error.name === "ValidationError") {
    console.log("Model definition is invalid:", error.details);
  } else if (error.name === "MigrationError") {
    console.log("Migration failed:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Use Cases

### E-commerce Platform

Model a complete e-commerce system:

```typescript
// Product model with variants
const product = await ontology.create({
  name: "product",
  fields: {
    id: { type: "uuid", primary: true },
    name: { type: "string", required: true },
    description: { type: "text" },
    price: { type: "currency", required: true },
    category: { type: "string", required: true },
    tags: { type: "array", items: "string" },
    attributes: { type: "json" }
  },
  relationships: {
    variants: { type: "hasMany", targetEntity: "product_variant" },
    reviews: { type: "hasMany", targetEntity: "review" },
    category: { type: "belongsTo", targetEntity: "category" }
  },
  indexes: [
    { fields: ["category", "price"] },
    { fields: ["tags"], unique: false }
  ]
});

// AI-generated order model
const order = await ontology.generation.generate(
  "Customer order with items, shipping address, payment status, and order tracking"
);
```

### Content Management System

Build a flexible CMS:

```typescript
// Use mixins for common CMS patterns
await ontology.mixins.create({
  name: "publishable",
  fields: {
    status: { 
      type: "enum", 
      enum: ["draft", "published", "archived"],
      default: "draft"
    },
    publishedAt: { type: "timestamp" },
    author: { type: "string", required: true }
  }
});

await ontology.mixins.create({
  name: "sluggable",
  fields: {
    slug: { type: "string", unique: true }
  }
});

// Create content types using mixins
const article = await ontology.create({
  name: "article",
  mixins: ["publishable", "sluggable", "timestamped"],
  fields: {
    title: { type: "string", required: true },
    content: { type: "text", required: true },
    excerpt: { type: "string" },
    featuredImage: { type: "string" }
  }
});
```

### Analytics and Reporting

Model analytical data structures:

```typescript
const analyticsEvent = await ontology.create({
  name: "analytics_event",
  substrates: {
    operational: "postgresql-main",
    analytical: "clickhouse-analytics",
    cache: "redis-aggregations"
  },
  fields: {
    id: { type: "uuid", primary: true },
    eventType: { type: "string", required: true },
    userId: { type: "uuid" },
    sessionId: { type: "string" },
    timestamp: { type: "timestamp", required: true },
    properties: { type: "json" },
    value: { type: "float" },
    metadata: { type: "json" }
  },
  indexes: [
    { fields: ["eventType", "timestamp"] },
    { fields: ["userId", "timestamp"] },
    { fields: ["sessionId", "timestamp"] }
  ]
});
```

## Performance Considerations

- **Index Strategy**: Define indexes based on query patterns
- **Substrate Routing**: Use analytical substrates for reporting workloads
- **Migration Planning**: Use zero-downtime migrations for production
- **Validation Rules**: Balance data integrity with performance
- **Caching**: Configure appropriate caching strategies

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand the system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns and best practices
