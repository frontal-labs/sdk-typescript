# Models SDK Examples

This directory contains comprehensive examples demonstrating the capabilities of the Frontal Models SDK. Each example file focuses on different aspects of model management, from basic CRUD operations to complex AI-powered workflows.

## Available Examples

### 1. Basic CRUD Operations (`basic-crud.ts`)
Demonstrates fundamental model management operations:
- Creating simple and advanced models with various field types
- Model validation and listing
- Model operations like updates and versioning
- Working with relationships and substrates

**Key features shown:**
- Field types: string, integer, boolean, uuid, timestamp, currency, json, array, enum
- Relationships: hasOne, hasMany, belongsTo, manyToMany
- Substrate routing for different data stores
- Model status management

### 2. Migrations (`migrations.ts`)
Shows how to handle schema changes safely:
- Planning migrations with risk assessment
- Applying zero-downtime migrations
- Rolling back changes
- Migration history tracking
- Complex migrations with relationships

**Key features shown:**
- Migration planning with impact analysis
- Zero-downtime deployment strategies
- Rollback capabilities
- System integrity checks

### 3. Rules and Mixins (`rules-mixins.ts`)
Demonstrates business logic management:
- Creating validation and transformation rules
- Managing rule evaluation
- Creating reusable mixins
- Advanced rule conditions

**Key features shown:**
- Business rule creation and management
- Rule evaluation against data
- Mixin creation for reusable schema components
- Rule severity levels and actions

### 4. AI Generation (`ai-generation.ts`)
Showcases AI-powered model generation:
- Generating models from natural language descriptions
- Inferring models from existing data
- Managing AI suggestions
- Multi-substrate model generation

**Key features shown:**
- Natural language to schema generation
- AI-powered model inference
- Suggestion management
- Semantic metadata generation

### 5. Complete Workflows (`complete-workflows.ts`)
End-to-end examples for real-world scenarios:
- Building a complete blog platform
- Creating an e-commerce schema
- Setting up analytics platforms
- Managing model relationships

**Key features shown:**
- Complete platform schema design
- Multi-model coordination
- Real-world workflow patterns
- Relationship management

## Running Examples

Each example can be run independently:

```bash
# Run basic CRUD examples
bun run examples/basic-crud.ts

# Run migration examples
bun run examples/migrations.ts

# Run rules and mixins examples
bun run examples/rules-mixins.ts

# Run AI generation examples
bun run examples/ai-generation.ts

# Run complete workflow examples
bun run examples/complete-workflows.ts
```

## Prerequisites

Before running these examples, ensure you have:

1. **Frontal Models SDK** installed and configured
2. **Environment variables** set up for API access
3. **Required substrates** available (PostgreSQL, ClickHouse, Redis, etc.)
4. **Proper authentication** credentials

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your credentials
```

## Example Features

### Field Types Supported
- **Basic**: string, integer, float, boolean
- **Identifiers**: uuid
- **Temporal**: timestamp
- **Financial**: currency
- **Structured**: json, array
- **Categorical**: enum
- **Search**: text, vector

### Relationship Types
- **hasOne**: One-to-one relationship
- **hasMany**: One-to-many relationship
- **belongsTo**: Many-to-one relationship
- **manyToMany**: Many-to-many relationship

### Substrate Support
- **Operational**: PostgreSQL, MySQL
- **Analytical**: ClickHouse, BigQuery
- **Cache**: Redis, Memcached
- **Search**: Elasticsearch, OpenSearch
- **Streaming**: Kafka, Pulsar

### Rule Actions
- **validate**: Data validation with error reporting
- **transform**: Data transformation and normalization
- **notify**: Notifications and warnings

### Migration Strategies
- **zero-downtime**: No service interruption
- **maintenance-window**: Scheduled downtime
- **immediate**: Immediate application

## Best Practices Demonstrated

1. **Model Design**: Proper field types, relationships, and indexing
2. **Validation**: Comprehensive rule-based validation
3. **Migration Safety**: Risk assessment and rollback planning
4. **Reusability**: Mixins for common schema patterns
5. **AI Integration**: Leveraging AI for schema design
6. **Multi-Substrate**: Optimizing for different data needs

## Error Handling

All examples include comprehensive error handling:
- Try-catch blocks for API calls
- Meaningful error messages
- Graceful failure handling
- Status logging and progress tracking

## Contributing

When adding new examples:

1. Follow the existing code style and patterns
2. Include comprehensive comments
3. Add error handling
4. Update this README
5. Test with real data when possible

## Support

For questions about these examples or the Models SDK:
- Check the [main documentation](../../docs/)
- Review the [API reference](../src/)
- Open an issue for bugs or feature requests
