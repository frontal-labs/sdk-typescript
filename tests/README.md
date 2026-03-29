# Root Tests

This directory contains global tests for the Frontal SDK monorepo.

## Test Structure

```
tests/
├── integration.test.ts    # Cross-package integration tests
├── setup.test.ts         # Global setup and configuration tests
├── performance.test.ts    # Performance and benchmark tests
├── utils/
│   └── test-helpers.ts # Common test utilities and mocks
└── README.md            # This file
```

## Test Categories

### Integration Tests (`integration.test.ts`)
- **Package Interoperability**: Verify all packages can be imported together
- **Configuration Management**: Test environment variable handling
- **Error Handling**: Ensure consistent error patterns
- **Type Safety**: Validate TypeScript exports
- **Performance**: Initialization and operation performance

### Setup Tests (`setup.test.ts`)
- **Environment Configuration**: Test environment variable setup
- **Test Utilities**: Verify custom matchers and global mocks
- **Path Resolution**: Test package alias resolution
- **Build Configuration**: Validate build outputs and formats
- **Development Tools**: Test linting and testing framework setup

### Performance Tests (`performance.test.ts`)
- **Initialization Performance**: Measure startup times
- **Memory Usage**: Test memory efficiency and leak detection
- **Throughput Tests**: High-frequency operation performance
- **Resource Management**: File handle and network resource management

### Test Utilities (`utils/test-helpers.ts`)
Common utilities for writing tests:
- **Mock Factories**: Create mock API responses, files, and configurations
- **Event Emitters**: Mock event-driven functionality
- **Performance Measurement**: Measure operation performance
- **Environment Helpers**: Temporarily modify environment variables
- **Retry Logic**: Handle flaky test scenarios

## Running Tests

### All Root Tests
```bash
# Run all root-level tests
bun run test tests/

# Run with coverage
bun run test:coverage tests/

# Run in watch mode
bun run test:watch tests/
```

### Specific Test Files
```bash
# Run only integration tests
bun run test tests/integration.test.ts

# Run only performance tests
bun run test tests/performance.test.ts
```

## Test Environment

Root tests automatically:
- Set `NODE_ENV=test`
- Set `CI=true`
- Load global test setup from `../test-setup.ts`
- Configure custom matchers and mocks

## Best Practices

1. **Use Test Helpers**: Import utilities from `utils/test-helpers.ts`
2. **Mock External Services**: Always mock API calls and network requests
3. **Test Environment**: Use `withEnvironment()` for temporary env changes
4. **Performance Tests**: Use `measurePerformance()` for consistent timing
5. **Clean Up**: Ensure tests clean up after themselves
6. **Isolation**: Each test should be independent of others

## Coverage

Root tests contribute to overall coverage metrics:
- Target: 80% across all metrics
- Reports: `coverage/index.html`
- Package-specific: `coverage/packages/*/`

## Debugging

### Verbose Output
```bash
# Run with verbose logging
DEBUG=* bun run test tests/
```

### Breakpoints
Root tests support debugging with:
- VS Code debugger
- Node.js inspector
- Source maps for TypeScript

## Contributing

When adding new root tests:

1. **Choose the right category**: Integration, setup, or performance
2. **Use existing utilities**: Leverage helpers from `utils/test-helpers.ts`
3. **Follow naming conventions**: Use `.test.ts` suffix
4. **Add documentation**: Update this README for new test files
5. **Test the tests**: Ensure new tests are reliable and fast
