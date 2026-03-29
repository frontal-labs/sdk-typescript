# Architecture

## System Overview

The Frontal Functions SDK is designed as a layered architecture that provides a clean, type-safe interface for deploying and managing serverless functions at the edge. The architecture follows a client-server pattern with strong separation of concerns.

## Architecture Layers

### 1. Client Layer

The client layer is the main entry point for developers using the SDK. It consists of:

- **Functions Class**: The primary client class that implements the `IFunctionsClient` interface
- **Functional API**: Convenience functions that use a global client instance
- **Configuration Management**: Handles API keys, base URLs, and other client settings

```typescript
// Client layer structure
Functions (class)
├── Constructor (config: FunctionsConfig)
├── deploy()
├── invoke()
├── list()
├── get()
├── delete()
├── stats()
└── updateTriggers()
```

### 2. API Layer

The API layer handles HTTP communication with the Frontal backend:

- **Request/Response Handling**: Manages HTTP requests and responses
- **Error Handling**: Converts HTTP errors to standardized API responses
- **Validation**: Uses Zod schemas for request/response validation
- **Retry Logic**: Implements retry mechanisms for failed requests

```typescript
// API layer flow
fetchRequest<T>()
├── Method routing (GET/POST/PUT/DELETE)
├── Request execution
├── Response parsing
├── Error handling
└── APIResponse<T> formatting
```

### 3. Type System Layer

The type system provides comprehensive type safety using TypeScript and Zod:

- **Interface Definitions**: TypeScript interfaces for all data structures
- **Zod Schemas**: Runtime validation schemas that mirror TypeScript types
- **Type Inference**: Automatic type generation from Zod schemas
- **Validation**: Runtime validation of all API inputs and outputs

## Core Components

### FunctionsClient

The `Functions` class is the core component that implements the `IFunctionsClient` interface:

```typescript
class Functions implements IFunctionsClient {
  private readonly client: FrontalClient;
  
  constructor(config: FunctionsConfig)
  async deploy(config: FunctionConfig)
  async list()
  async get(id: string)
  async delete(id: string)
  async invoke(id: string, options?: InvokeOptions)
  async stats(id: string)
  async updateTriggers(id: string, trigger: FunctionConfig["trigger"])
}
```

### HTTP Client Integration

The Functions SDK integrates with the core `FrontalClient` for HTTP operations:

- **Authentication**: Automatic API key handling
- **Base URL Management**: Configurable API endpoints
- **Request Interceptors**: Standardized request formatting
- **Response Interceptors**: Consistent response handling

### Validation Pipeline

All API operations go through a validation pipeline:

```typescript
// Validation flow
Input Data
├── Zod Schema Validation
├── Type Checking
├── Sanitization
└── API Request
```

## Data Flow

### Function Deployment Flow

```
User Input
    ↓
Zod Validation (functionConfigSchema)
    ↓
HTTP POST /functions/deploy
    ↓
Backend Processing
    ↓
Response Validation (functionSchema)
    ↓
APIResponse<FunctionEntry>
```

### Function Invocation Flow

```
Invocation Request
    ↓
Zod Validation (invokeOptionsSchema)
    ↓
HTTP POST /functions/invoke/{id}
    ↓
Function Execution
    ↓
Response Processing
    ↓
APIResponse<unknown>
```

## Error Handling Architecture

### Error Types

The SDK defines a comprehensive error handling system:

```typescript
interface ErrorResponse {
  message: string;
  statusCode: number;
  name: string;
}
```

### Error Categories

1. **Validation Errors**: Zod validation failures (400)
2. **Authentication Errors**: Invalid API keys (401)
3. **Authorization Errors**: Insufficient permissions (403)
4. **Not Found Errors**: Resource doesn't exist (404)
5. **Server Errors**: Backend issues (500+)
6. **Network Errors**: Connection problems

### Error Propagation

```
API Error
    ↓
HTTP Status Code
    ↓
ErrorResponse Mapping
    ↓
APIResponse<T>.error
    ↓
User Handling
```

## Configuration Architecture

### Configuration Sources

The SDK supports multiple configuration sources:

1. **Environment Variables**: `FRONTAL_API_KEY`, `FRONTAL_BASE_URL`
2. **Constructor Parameters**: Direct configuration object
3. **Global Configuration**: Using `configure()` function

### Configuration Hierarchy

```
Constructor Config (highest priority)
    ↓
Global Config (configure())
    ↓
Environment Variables (default)
```

## Runtime Support Architecture

### Runtime Abstraction

The SDK provides a runtime-agnostic interface:

```typescript
type Runtime = "nodejs18" | "nodejs20" | "python3.9" | "go1.x";
```

### Runtime-Specific Handling

Each runtime has specific deployment and execution characteristics:

- **Node.js**: JavaScript/TypeScript functions with npm packages
- **Python**: Python functions with pip dependencies
- **Go**: Compiled Go binaries

## Trigger System Architecture

### Trigger Types

The SDK supports multiple trigger mechanisms:

1. **HTTP Triggers**: RESTful API endpoints
2. **Cron Triggers**: Scheduled executions
3. **Queue Triggers**: Message-driven executions

### Trigger Implementation

```typescript
interface TriggerConfig {
  type: "http" | "cron" | "queue";
  schedule?: string;      // Cron expressions
  queueName?: string;     // Queue name for queue triggers
}
```

## Monitoring and Analytics

### Invocation Statistics

The SDK provides built-in monitoring capabilities:

```typescript
interface InvocationStats {
  functionId: string;
  totalInvocations: number;
  errors: number;
  averageDuration: number;
  lastInvoked?: string;
}
```

### Performance Metrics

- **Execution Time**: Function duration tracking
- **Error Rates**: Success/failure ratios
- **Invocation Counts**: Usage statistics
- **Last Invocation**: Recent activity tracking

## Security Architecture

### API Key Management

- **Environment Variables**: Secure key storage
- **Client-Side Storage**: In-memory key management
- **Transmission Security**: HTTPS-only communication

### Input Validation

- **Schema Validation**: All inputs validated against Zod schemas
- **Type Safety**: TypeScript compile-time checks
- **Sanitization**: Input data cleaning and normalization

## Extensibility Architecture

### Plugin System

The SDK is designed for extensibility:

- **Interface-Based**: Clear interfaces for customization
- **Dependency Injection**: Configurable HTTP client
- **Middleware Support**: Request/response interception

### Future Enhancements

The architecture supports future additions:

- **New Runtimes**: Easy runtime addition
- **Additional Triggers**: New trigger mechanisms
- **Advanced Monitoring**: Enhanced analytics
- **Custom Deployments**: Specialized deployment strategies

## Testing Architecture

### Unit Testing

- **Mock HTTP Client**: Isolated testing
- **Schema Validation Testing**: Input/output validation
- **Error Scenario Testing**: Comprehensive error coverage

### Integration Testing

- **API Endpoint Testing**: Real API interaction
- **End-to-End Testing**: Complete workflow validation
- **Performance Testing**: Load and stress testing

This architecture ensures the Functions SDK is robust, maintainable, and extensible while providing a clean, type-safe interface for developers.
