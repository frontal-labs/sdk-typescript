# Frontal Functions Examples

This directory contains comprehensive examples demonstrating how to use the Frontal Functions SDK. Each example file focuses on different aspects of the SDK and provides practical, real-world usage patterns.

## Example Files

### [basic-usage.ts](./basic-usage.ts)
**Core functionality examples** - Demonstrates the fundamental operations of the Functions SDK:
- Deploying HTTP and scheduled functions
- Listing and retrieving function details
- Invoking functions with payloads
- Managing function lifecycle (create, read, update, delete)
- Using custom client configuration

**Key patterns shown:**
- Environment variable-based authentication
- Error handling for API responses
- Function configuration with different runtimes
- Trigger configuration (HTTP, cron, queue)

### [error-handling.ts](./error-handling.ts)
**Robust error handling patterns** - Shows how to handle various error scenarios:
- API error classification and handling
- Retry patterns with exponential backoff
- Graceful degradation strategies
- Batch operations with error collection
- Timeout handling
- Input validation error handling
- Circuit breaker pattern for resilience

**Key patterns shown:**
- Structured error response handling
- Retry logic with backoff strategies
- Fallback mechanisms
- Error aggregation and reporting

### [advanced-patterns.ts](./advanced-patterns.ts)
**Advanced architectural patterns** - Demonstrates sophisticated usage patterns:
- Function composition and chaining
- Parallel execution and batch processing
- Map-reduce patterns
- Fan-out/fan-in patterns
- Caching strategies
- Monitoring and observability
- Workflow orchestration

**Key patterns shown:**
- Asynchronous function pipelines
- Concurrent processing with batching
- Result aggregation and coordination
- Performance optimization techniques
- Metrics collection and monitoring

### [testing.ts](./testing.ts)
**Comprehensive testing strategies** - Provides testing utilities and examples:
- Mock implementation for unit testing
- Integration testing patterns
- Performance testing
- Load testing with concurrent requests
- End-to-end workflow testing

**Key patterns shown:**
- Test-driven development approach
- Mock services for isolated testing
- Performance benchmarking
- Load testing methodologies
- Complete workflow validation

## Getting Started

### Prerequisites

1. Install the Functions SDK:
```bash
npm install @frontal-labs/functions
# or
bun add @frontal-labs/functions
```

2. Set up your environment variables:
```bash
export FRONTAL_API_KEY="your-api-key"
export FRONTAL_BASE_URL="https://api.frontal.dev"  # optional
```

### Running Examples

Each example file can be run directly:

```bash
# Basic usage examples
bun run examples/basic-usage.ts

# Error handling examples
bun run examples/error-handling.ts

# Advanced patterns
bun run examples/advanced-patterns.ts

# Testing examples
bun run examples/testing.ts
```

### Using Examples in Your Code

You can also import and use the example functions in your own code:

```typescript
import { deployHttpFunction, invokeFunction } from "@frontal-labs/functions/examples/basic-usage";

// Deploy a function
const deployed = await deployHttpFunction();

// Invoke the function
if (deployed) {
  await invokeFunction(deployed.id);
}
```

## Common Patterns

### 1. Basic Function Deployment

```typescript
import { Functions, type FunctionConfig } from "@frontal-labs/functions";

const functions = new Functions();

const config: FunctionConfig = {
  name: "my-function",
  runtime: "nodejs20",
  handler: "index.handler",
  memory: 256,
  timeout: 30,
  trigger: {
    type: "http",
  },
};

const result = await functions.deploy(config);
if (result.error) {
  console.error("Deployment failed:", result.error.message);
} else {
  console.log("Function deployed:", result.data);
}
```

### 2. Error Handling with Retry

```typescript
async function invokeWithRetry(functionId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await functions.invoke(functionId);
    
    if (!result.error) {
      return result.data;
    }
    
    if (attempt === maxRetries) {
      throw new Error(`Failed after ${maxRetries} attempts`);
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  }
}
```

### 3. Parallel Processing

```typescript
async function processInParallel(items: unknown[], batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => 
      functions.invoke("processor", { payload: item })
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
```

## Configuration Options

The Functions client supports various configuration options:

```typescript
const functions = new Functions({
  apiKey: "your-api-key",           // Override environment variable
  baseUrl: "https://api.frontal.dev", // Custom API endpoint
  timeout: 30000,                   // Request timeout in ms
  maxRetries: 3,                    // Automatic retry attempts
  retryDelay: 1000,                 // Delay between retries
  headers: {                        // Custom headers
    "X-User-Agent": "MyApp/1.0",
  },
});
```

## Function Runtimes

The SDK supports multiple runtimes:

- **Node.js**: `nodejs18`, `nodejs20`
- **Python**: `python3.9`
- **Go**: `go1.x`

## Trigger Types

Functions can be triggered by different events:

- **HTTP**: Webhook/HTTP endpoint
- **Cron**: Scheduled execution
- **Queue**: Message queue processing

## Best Practices

1. **Always handle errors**: Check for `result.error` in API responses
2. **Use appropriate timeouts**: Set reasonable timeout values for your functions
3. **Implement retry logic**: Handle transient failures with exponential backoff
4. **Monitor performance**: Track invocation times and error rates
5. **Use environment variables**: Store sensitive configuration in environment
6. **Test thoroughly**: Use the testing examples to validate your implementations

## Troubleshooting

### Common Issues

1. **Authentication errors**: Verify your API key is correct and has proper permissions
2. **Validation errors**: Check that your function configuration matches the schema
3. **Timeout errors**: Increase timeout values or optimize your function code
4. **Rate limiting**: Implement backoff strategies and respect API limits

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export DEBUG=frontal:*
```

## Contributing

To add new examples:

1. Create a new file in the `examples/` directory
2. Follow the existing code style and patterns
3. Include comprehensive JSDoc comments
4. Add error handling and validation
5. Update this README with your new example

## Resources

- [Functions API Documentation](../docs/)
- [Type Definitions](../src/types.ts)
- [Client Implementation](../src/client.ts)
- [Main Package README](../README.md)
