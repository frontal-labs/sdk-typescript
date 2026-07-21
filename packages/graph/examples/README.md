# Graph SDK Examples

This directory contains comprehensive examples demonstrating the capabilities of the Frontal Graph SDK. Each example focuses on specific features and use cases.

## Available Examples

### [basic-crud.ts](./basic-crud.ts)
Demonstrates fundamental CRUD operations with entities:
- Creating entities with data and linked entities
- Reading entities by ID and listing with filters
- Updating entity fields and metadata
- Deleting entities
- Using both custom clients and default client

### [graph-traversal.ts](./graph-traversal.ts)
Shows graph traversal and relationship querying:
- Creating interconnected entities (users, projects, companies)
- Traversing graphs in different directions (outgoing, incoming, both)
- Finding shortest paths between entities
- Finding all possible paths with filtering
- Complex traversal with relationship type and weight filters

### [semantic-search.ts](./semantic-search.ts)
Illustrates semantic search and natural language queries:
- Creating content-rich entities (articles, documents)
- Semantic search with similarity thresholds
- Natural language question answering
- Cross-entity semantic search
- Combining semantic search with traditional filters

### [time-travel-and-history.ts](./time-travel-and-history.ts)
Demonstrates time travel and audit trail features:
- Querying entities at specific points in time
- Accessing complete entity history with change tracking
- Version-specific operations and comparisons
- Audit trail for compliance and debugging
- Historical data analysis and reporting

### [batch-operations.ts](./batch-operations.ts)
Shows efficient batch processing:
- Batch creation of multiple entities
- Batch updates with different field sets
- Mixed operations (create, update, delete) in single batch
- Error handling and retry logic for failed operations
- Performance comparison between batch and individual operations

### [advanced-querying.ts](./advanced-querying.ts)
Covers complex querying capabilities:
- Multi-condition filtering with AND/OR logic
- Cursor-based pagination for large result sets
- Field selection and projection for performance
- Advanced sorting with multiple fields
- Aggregation and grouping concepts
- Text search and pattern matching
- Query optimization techniques

## Running the Examples

### Prerequisites

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your FRONTAL_API_KEY and FRONTAL_BASE_URL
```

### Running Individual Examples

Each example can be run independently:

```bash
# Run basic CRUD example
bun run examples/basic-crud.ts

# Run graph traversal example
bun run examples/graph-traversal.ts

# Run semantic search example
bun run examples/semantic-search.ts

# Run time travel example
bun run examples/time-travel-and-history.ts

# Run batch operations example
bun run examples/batch-operations.ts

# Run advanced querying example
bun run examples/advanced-querying.ts
```

### Running All Examples

To run all examples in sequence:

```bash
bun run examples
```

## Key Concepts Demonstrated

### Entity Management
- **Entities**: Core objects with typed data and metadata
- **Linked Entities**: Relationships between entities
- **Versions**: Automatic versioning with change tracking
- **Metadata**: System-managed fields (timestamps, creators, etc.)

### Graph Operations
- **Traversal**: Walking through entity relationships
- **Path Finding**: Discovering connections between entities
- **Relationships**: Typed connections with optional weights
- **Bidirectional Navigation**: Traversing in both directions

### Search Capabilities
- **Semantic Search**: AI-powered similarity matching
- **Natural Language Queries**: Question-answering capabilities
- **Traditional Filtering**: Exact match, range, and inclusion filters
- **Full-text Search**: Text pattern matching and regex

### Temporal Features
- **Time Travel**: Querying historical entity states
- **Audit Trails**: Complete change history tracking
- **Version Control**: Accessing specific entity versions
- **Historical Analysis**: Trend analysis over time

### Performance Features
- **Batch Operations**: Efficient bulk processing
- **Pagination**: Cursor-based navigation for large datasets
- **Field Selection**: Requesting only needed data
- **Query Optimization**: Best practices for performance

## Error Handling

All examples include comprehensive error handling demonstrating:
- API error responses
- Validation errors
- Network issues
- Retry logic for batch operations
- Graceful degradation

## Best Practices

The examples demonstrate several best practices:

1. **Type Safety**: Using TypeScript interfaces and Zod schemas
2. **Error Handling**: Proper try-catch blocks with meaningful error messages
3. **Performance**: Using appropriate field selection and pagination
4. **Security**: Proper API key management and environment variables
5. **Code Organization**: Clear separation of concerns and reusable patterns

## Common Patterns

### Client Initialization
```typescript
import { createGraphClient } from '@frontal-labs/graph'
import { FrontalClient } from '@frontal-labs/core'

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY,
  baseUrl: process.env.FRONTAL_BASE_URL
})

const graphClient = createGraphClient(client)
```

### Entity Access
```typescript
const userEntities = graphClient.entities('user')
const users = await userEntities.list({ limit: 10 })
```

### Query Building
```typescript
const results = await graphClient.query({
  entityType: 'user',
  conditions: { role: { eq: 'developer' } },
  orderBy: [{ field: 'name', direction: 'asc' }],
  limit: 20
})
```

## Troubleshooting

### Common Issues

1. **Module Not Found**: Ensure dependencies are installed with `bun install`
2. **API Key Errors**: Verify environment variables are set correctly
3. **Network Issues**: Check internet connection and API endpoint availability
4. **Type Errors**: Ensure TypeScript configuration is correct

### Debug Tips

- Enable verbose logging in the client
- Check API responses in browser dev tools
- Validate data against schemas
- Use console.log to inspect intermediate results

## Contributing

When adding new examples:

1. Follow the existing code style and patterns
2. Include comprehensive error handling
3. Add detailed comments explaining the concepts
4. Update this README with the new example
5. Test with realistic data scenarios

## Additional Resources

- [Frontal Graph SDK Documentation](../../docs/)
- [API Reference](../../docs/api/)
- [Architecture Overview](../../docs/ARCHITECTURE.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
