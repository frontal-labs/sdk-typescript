# Test Suite for @frontal/core

This directory contains comprehensive tests for the `@frontal/core` package.

## Test Structure

```
tests/
├── setup.ts              # Test configuration and utilities
├── client.test.ts         # FrontalClient tests
├── http.test.ts           # HttpClient tests
├── config.test.ts         # Configuration schema tests
├── errors.test.ts         # Error handling tests
├── schemas.test.ts        # Zod schema validation tests
├── pagination.test.ts     # Pagination utilities tests
├── retry.test.ts          # Retry logic tests
├── keys.test.ts           # Environment variable tests
├── integration.test.ts    # End-to-end integration tests
└── README.md              # This file
```

## Test Coverage

### Core Components
- **FrontalClient**: High-level SDK interface
- **HttpClient**: Low-level HTTP client with retry logic
- **Configuration**: Type-safe configuration with Zod validation
- **Error Handling**: Comprehensive error classes and parsing
- **Schemas**: Zod schemas for API responses and requests
- **Pagination**: Utilities for paginated API responses
- **Retry Logic**: Configurable retry strategies with jitter
- **Environment Variables**: Secure environment variable management

### Test Categories

#### Unit Tests
- Individual module testing
- Schema validation
- Error class behavior
- Configuration parsing
- Retry logic algorithms

#### Integration Tests
- End-to-end workflows
- Client-server interactions
- Error scenario handling
- Performance testing
- Real-world use cases

## Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test tests/client.test.ts

# Run tests in watch mode
bun test --watch
```

## Test Utilities

The `setup.ts` file provides:

- **Mock factories**: For creating test data and responses
- **Custom matchers**: For asserting specific types
- **Environment helpers**: For test isolation
- **Mock fetch implementation**: For HTTP request testing

## Key Features Tested

### 1. Type Safety
- Zod schema validation
- TypeScript type inference
- Configuration type safety

### 2. Error Handling
- HTTP status code mapping
- Error class hierarchy
- Error parsing and formatting

### 3. Retry Logic
- Exponential backoff
- Linear backoff
- Constant backoff
- Jitter implementation

### 4. Pagination
- Async iteration
- Page navigation
- Data aggregation

### 5. Configuration
- Environment variable parsing
- Schema validation
- Default value application

### 6. HTTP Client
- Request building
- Response parsing
- Header management
- Authentication

## Test Scenarios

### Happy Path
- Successful API requests
- Valid configuration parsing
- Proper error handling
- Expected retry behavior

### Error Scenarios
- Network failures
- API errors (4xx, 5xx)
- Invalid configuration
- Schema validation failures

### Edge Cases
- Empty responses
- Large datasets
- Concurrent requests
- Malformed data

## Performance Testing

Tests include performance validation for:
- Large dataset handling
- Concurrent request processing
- Schema validation efficiency
- Retry algorithm performance

## Security Testing

Tests cover:
- API key validation
- Environment variable security
- Error message sanitization
- Input validation

## Real-World Scenarios

Integration tests simulate:
- Complete user management workflows
- Pagination with large datasets
- Error recovery scenarios
- Production-like configurations

## Best Practices

### Test Isolation
- Each test runs independently
- Mock cleanup between tests
- Environment variable isolation

### Comprehensive Coverage
- Success and failure paths
- Edge cases and boundary conditions
- Type safety validation

### Maintainability
- Clear test descriptions
- Reusable test utilities
- Proper test organization

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use provided test utilities
3. Include both positive and negative test cases
4. Add integration tests for new features
5. Update this README if needed

## Debugging Tests

For debugging failed tests:

1. Use `console.log` for temporary debugging
2. Check mock call counts and arguments
3. Verify schema validation errors
4. Review environment variable setup

## Coverage Goals

Target coverage:
- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 95%+
- **Lines**: 95%+

Run `bun test --coverage` to generate coverage reports.
