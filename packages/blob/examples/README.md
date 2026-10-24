# Blob Examples

This directory contains comprehensive examples demonstrating how to use the Frontal Blob SDK. Each example focuses on specific aspects of blob storage operations and can be run independently.

## Available Examples

### 1. Basic CRUD Operations (`basic-crud.ts`)
Demonstrates fundamental storage operations:
- **Create**: Upload objects to buckets
- **Read**: Download objects as blobs
- **Update**: Modify existing objects
- **Delete**: Remove objects from buckets
- **List**: Enumerate objects in buckets with prefix filtering
- **Copy/Move**: Object manipulation within and across buckets

**Run**: `bun run basic-crud.ts`

### 2. File Operations (`file-operations.ts`)
Comprehensive file handling examples:
- Upload different data types (text, JSON, binary, CSV)
- Download and process various file formats
- Local filesystem integration
- Batch operations for multiple files
- File type detection and handling

**Run**: `bun run file-operations.ts`

### 3. Signed URLs (`signed-urls.ts`)
Secure temporary access examples:
- Generate signed URLs for read/write/delete operations
- Custom expiry times for different use cases
- Browser-based uploads using signed URLs
- Secure file sharing with access controls
- Real-world sharing scenarios

**Run**: `bun run signed-urls.ts`

### 4. Streaming Operations (`streaming.ts`)
Large file and real-time data handling:
- Stream downloads for memory-efficient processing
- Backpressure handling and controlled processing
- Real-time log filtering and analysis
- Stream transformation (CSV to JSON)
- Performance monitoring and optimization

**Run**: `bun run streaming.ts`

### 5. Metadata Operations (`metadata.ts`)
Object metadata management:
- Retrieve and analyze object metadata
- Metadata-based file categorization
- Size and content type analysis
- Metadata validation and verification
- Caching strategies for metadata

**Run**: `bun run metadata.ts`

### 6. Error Handling (`error-handling.ts`)
Robust error management strategies:
- Error classification and appropriate responses
- Retry logic with exponential backoff
- Circuit breaker pattern for resilience
- Graceful degradation with fallbacks
- Comprehensive error logging and monitoring

**Run**: `bun run error-handling.ts`

## Getting Started

### Prerequisites
- Node.js or Bun runtime
- Valid Frontal Blob credentials
- Environment variables configured for blob access

### Environment Setup
Create a `.env` file in the examples directory:
```env
FRONTAL_API_KEY=your_api_key_here
FRONTAL_API_URL=https://api.frontal.dev
```

### Running Examples

```bash
# Run a specific example
bun run basic-crud.ts
```

## Example Structure

Each example file follows a consistent structure:

1. **Imports and Setup**: Import required dependencies and initialize blob client
2. **Individual Functions**: Focused functions demonstrating specific operations
3. **Main Runner**: Orchestrates all example functions
4. **Error Handling**: Comprehensive error handling and logging
5. **Cleanup**: Automatic cleanup of test data

## Best Practices Demonstrated

### Error Handling
- Wrap blob calls in try/catch and handle `FrontalError` (check `statusCode`, `code`, `retryable`)
- Implement retry logic for transient failures
- Use circuit breakers for resilience
- Provide meaningful error messages

### Performance
- Use streaming for large files
- Implement caching for frequently accessed metadata
- Batch operations when possible
- Monitor and optimize performance metrics

### Security
- Use signed URLs for temporary access
- Validate inputs and sanitize data
- Implement proper access controls
- Handle sensitive data appropriately

### Resource Management
- Clean up test data after operations
- Use appropriate timeouts for operations
- Handle memory efficiently with streams
- Monitor resource usage

## Common Patterns

Blob methods return their results directly (`download` returns a `Blob`,
`getSignedUrl` returns a `string`, `delete` returns `void`) and throw a
`FrontalError` on failure. There is no `{ data, error }` envelope.

### Basic Operation Pattern
```typescript
import { FrontalError } from "@frontal-labs/core";

try {
  await blob.upload({ bucket, key, data, contentType: "text/plain" });
  console.log("Operation succeeded");
} catch (error) {
  if (FrontalError.isInstance(error)) {
    console.error("Operation failed:", error.code, error.statusCode);
  }
  throw error;
}
```

### Error Handling Pattern
```typescript
try {
  const file = await blob.download({ bucket, key });
  processResult(await file.text());
} catch (error) {
  if (FrontalError.isInstance(error) && error.retryable) {
    // Transient failure (rate limit, 5xx, network): retry with backoff
  }
  handleUnexpectedError(error);
}
```

### Streaming Pattern
```typescript
const stream = await blob.downloadStream({ bucket, key });
const reader = stream.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Process chunk
    processChunk(value);
  }
} finally {
  reader.releaseLock();
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correctly set
   - Check environment variables
   - Ensure proper permissions

2. **Network Issues**
   - Implement retry logic
   - Use appropriate timeouts
   - Check network connectivity

3. **Large File Issues**
   - Use streaming operations
   - Monitor memory usage
   - Implement progress tracking

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=frontal:*
```

## Contributing

When adding new examples:

1. Follow the established structure and patterns
2. Include comprehensive error handling
3. Add proper cleanup procedures
4. Document the example purpose and usage
5. Test thoroughly before submitting

## Support

For issues with the examples or the Blob SDK:
- Check the [Frontal Documentation](https://docs.frontal.dev)
- Review the [SDK Repository Issues](https://github.com/frontal-labs/sdk-typescript/issues)
- Contact Frontal support for production issues
