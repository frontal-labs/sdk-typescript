# Architecture

## System Overview

The Frontal Pipelines SDK is designed as a comprehensive declarative data pipeline system that provides substrate orchestration and graph entity awareness. It enables building complex data workflows with type safety, intelligent automation, and real-time monitoring.

## Architecture Layers

### 1. Service Layer

The service layer provides the main entry points for pipeline operations:

- **PipelinesService**: Primary client for pipeline management
- **PipelineBuilder**: Fluent builder for constructing pipeline definitions
- **PipelineAccessor**: Specialized accessor for individual pipeline operations
- **LineageNamespace**: Data lineage and dependency tracking

### 2. Definition Layer

The definition layer handles pipeline construction and validation:

- **Pipeline Builder**: Fluent API for building pipelines step-by-step
- **Schema Validation**: Zod-based validation for pipeline definitions
- **Type Safety**: TypeScript interfaces for all pipeline components
- **Configuration Management**: Centralized configuration handling

### 3. Execution Layer

The execution layer manages pipeline runtime operations:

- **Step Execution**: Orchestrates individual pipeline steps
- **Source Handling**: Manages different trigger sources (graph, webhook, schedule, manual)
- **Error Handling**: Configurable retry policies and error strategies
- **State Management**: Tracks pipeline execution state and context

### 4. Orchestration Layer

The orchestration layer coordinates pipeline execution across substrates:

- **Substrate Orchestration**: Manages execution across different backends
- **Dependency Resolution**: Handles step dependencies and conditional execution
- **Resource Management**: Optimizes resource allocation and scheduling
- **Parallel Execution**: Manages concurrent step execution where possible

### 5. Monitoring Layer

The monitoring layer provides visibility into pipeline operations:

- **Health Monitoring**: Real-time pipeline health assessment
- **Performance Metrics**: Execution time, success rates, throughput tracking
- **Alerting**: Configurable alerts for pipeline issues
- **Lineage Tracking**: Complete data flow and dependency mapping

## Core Components

### PipelinesService

The main service class orchestrates all pipeline operations:

```typescript
class PipelinesService {
  constructor(private readonly http: HttpClient)
  
  define(name: string): PipelineBuilder
  pipeline(id: string): PipelineAccessor
  list(opts?: ListOptions): Promise<PageResult<Pipeline>>
  create(definition: PipelineDefinition): Promise<Pipeline>
  
  readonly lineage: LineageNamespace
}
```

### PipelineBuilder

Fluent builder for constructing pipeline definitions:

```typescript
class PipelineBuilder {
  private _definition: Partial<PipelineDefinition> & { name: string }
  
  // Configuration methods
  description(text: string): this
  schedule(cron: string): this
  timeout(duration: string): this
  retryPolicy(policy: RetryPolicy): this
  errorHandling(strategy: ErrorStrategy): this
  tags(...tags: string[]): this
  
  // Source methods
  source(source: PipelineSource): this
  fromGraph(entityType: string, filter?: Record<string, unknown>): this
  fromWebhook(url: string, config?: Record<string, unknown>): this
  fromSchedule(cron: string): this
  fromManual(): this
  
  // Step methods
  collect(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  transform(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  enrich(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  validate(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  write(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  notify(id: string, config?: Record<string, unknown>, opts?: StepOptions): this
  
  // Creation methods
  create(): Promise<Pipeline>
  activate(): Promise<Pipeline>
}
```

### PipelineAccessor

Provides CRUD operations for specific pipelines:

```typescript
class PipelineAccessor {
  constructor(private readonly id: string, private readonly http: HttpClient)
  
  get(): Promise<Pipeline>
  update(definition: Partial<PipelineDefinition>): Promise<Pipeline>
  delete(): Promise<void>
  
  // Execution methods
  runs(opts?: RunOptions): Promise<PageResult<PipelineRun>>
  run(runId: string): Promise<PipelineRun>
  trigger(input?: Record<string, unknown>): Promise<PipelineRun>
  
  // Backfill methods
  backfills(opts?: BackfillOptions): Promise<PageResult<Backfill>>
  backfill(from: string, to: string, opts?: BackfillConfig): Promise<Backfill>
  
  // Monitoring methods
  health(): Promise<PipelineHealth>
}
```

### LineageNamespace

Handles data lineage and dependency tracking:

```typescript
class LineageNamespace {
  constructor(private readonly http: HttpClient)
  
  graph(opts?: LineageOptions): Promise<LineageGraph>
  upstream(entityType: string, entityId: string): Promise<LineageResult>
  downstream(entityType: string, entityId: string): Promise<LineageResult>
}
```

## Data Flow Architecture

### Pipeline Definition Flow

```
Pipeline Definition Request
    ↓
Builder Configuration
    ↓
Schema Validation
    ↓
Source Configuration
    ↓
Step Definition
    ↓
Dependency Analysis
    ↓
Pipeline Creation
    ↓
Activation (optional)
```

### Pipeline Execution Flow

```
Trigger Event
    ↓
Source Processing
    ↓
Step Orchestration
    ↓
Conditional Execution
    ↓
Error Handling
    ↓
State Management
    ↓
Completion Notification
```

### Data Lineage Flow

```
Pipeline Execution
    ↓
Entity Tracking
    ↓
Dependency Mapping
    ↓
Graph Construction
    ↓
Lineage Storage
    ↓
Query Interface
```

## Pipeline Architecture

### Pipeline Sources

Multiple trigger types support different use cases:

```typescript
interface PipelineSource {
  type: 'graph-entity' | 'webhook' | 'schedule' | 'manual';
  entityType?: string;        // For graph-entity sources
  filter?: Record<string, unknown>;  // Entity filtering
  config?: Record<string, unknown>; // Source-specific config
}
```

#### Graph Entity Source

Monitors graph database entity changes:

```
Graph Entity Change
    ↓
Change Detection
    ↓
Filter Application
    ↓
Event Generation
    ↓
Pipeline Trigger
```

#### Webhook Source

Handles HTTP webhook triggers:

```
HTTP Request
    ↓
Authentication
    ↓
Validation
    ↓
Event Parsing
    ↓
Pipeline Trigger
```

#### Schedule Source

Manages time-based triggers:

```
Cron Schedule
    ↓
Time Calculation
    ↓
Trigger Generation
    ↓
Pipeline Execution
```

#### Manual Source

Supports manual pipeline triggering:

```
Manual Request
    ↓
Authorization
    ↓
Input Validation
    ↓
Pipeline Execution
```

### Pipeline Steps

Six types of pipeline steps with specific responsibilities:

#### Collect Steps

Data gathering operations:

```
Source Data
    ↓
Batch Processing
    ↓
Windowing
    ↓
Data Collection
    ↓
Output Generation
```

#### Transform Steps

Data processing and transformation:

```
Input Data
    ↓
Transformation Logic
    ↓
Data Validation
    ↓
Output Generation
```

#### Enrich Steps

Data enrichment from external sources:

```
Input Data
    ↓
Enrichment Logic
    ↓
External API Calls
    ↓
Data Merging
    ↓
Output Generation
```

#### Validate Steps

Data quality and business rule validation:

```
Input Data
    ↓
Rule Application
    ↓
Quality Assessment
    ↓
Validation Results
```

#### Write Steps

Data output to destinations:

```
Processed Data
    ↓
Format Transformation
    ↓
Destination Connection
    ↓
Data Writing
    ↓
Confirmation
```

#### Notify Steps

Alert and notification sending:

```
Trigger Condition
    ↓
Message Generation
    ↓
Channel Selection
    ↓
Notification Sending
    ↓
Delivery Confirmation
```

## Orchestration Architecture

### Step Dependencies

Handles complex dependency relationships between steps:

```typescript
interface StepDependency {
  dependsOn: string[];           // Required step dependencies
  condition?: string;             // Conditional execution logic
  timeout?: string;               // Step-specific timeout
  retry?: RetryConfig;            // Step-specific retry policy
}
```

### Conditional Execution

Supports conditional pipeline execution:

```
Step Execution
    ↓
Condition Evaluation
    ↓
Branch Selection
    ↓
Conditional Execution
    ↓
Result Merging
```

### Parallel Processing

Optimizes performance through parallel execution:

```
Dependency Analysis
    ↓
Parallel Grouping
    ↓
Concurrent Execution
    ↓
Result Collection
    ↓
Result Merging
```

## Error Handling Architecture

### Retry Policies

Configurable retry strategies for different failure scenarios:

```typescript
interface RetryPolicy {
  type: 'linear' | 'exponential' | 'none';
  maxAttempts?: number;
  baseDelay?: string;
  maxDelay?: string;
}
```

#### Linear Retry

Consistent delay between retry attempts:

```
Failure Detection
    ↓
Retry Attempt
    ↓
Fixed Delay
    ↓
Success Check
    ↓
Completion or Next Retry
```

#### Exponential Retry

Increasing delays for transient failures:

```
Failure Detection
    ↓
Retry Attempt
    ↓
Exponential Backoff
    ↓
Success Check
    ↓
Completion or Next Retry
```

### Error Strategies

Different approaches to handling pipeline failures:

```typescript
interface ErrorStrategy {
  type: 'fail' | 'skip' | 'retry';
  continueOnError?: boolean;
  errorThreshold?: number;
  escalationPolicy?: EscalationPolicy;
}
```

#### Fail Strategy

Stops pipeline execution on failure:

```
Error Detection
    ↓
Pipeline Stop
    ↓
Error Reporting
    ↓
Cleanup
```

#### Skip Strategy

Continues pipeline execution, skipping failed steps:

```
Error Detection
    ↓
Step Skip
    ↓
Context Update
    ↓
Continue Execution
```

#### Retry Strategy

Attempts to recover from failures:

```
Error Detection
    ↓
Retry Logic
    ↓
Recovery Attempt
    ↓
Success Check
```

## Monitoring Architecture

### Health Assessment

Real-time pipeline health monitoring:

```typescript
interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRun: RunSummary;
  recentRuns: RunSummary[];
  metrics: HealthMetrics;
  alerts: Alert[];
}
```

#### Health Metrics

Performance and reliability indicators:

```typescript
interface HealthMetrics {
  avgRunTime: number;      // Average execution time
  successRate: number;       // Success percentage
  errorRate: number;         // Error percentage
  throughput: number;        // Records processed per hour
}
```

#### Alert System

Configurable alerting for pipeline issues:

```typescript
interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}
```

## Lineage Architecture

### Data Flow Tracking

Complete tracking of data movement through pipelines:

```
Pipeline Execution
    ↓
Entity Identification
    ↓
Relationship Mapping
    ↓
Flow Recording
    ↓
Graph Construction
```

### Dependency Management

Tracks upstream and downstream dependencies:

```typescript
interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  lastUpdated: string;
}

interface LineageNode {
  id: string;
  type: 'pipeline' | 'entity' | 'dataset';
  name: string;
  metadata?: Record<string, unknown>;
}

interface LineageEdge {
  from: string;
  to: string;
  type: 'data-flow' | 'dependency' | 'produces';
  metadata?: Record<string, unknown>;
}
```

## Performance Architecture

### Resource Optimization

Efficient resource utilization across pipeline execution:

```typescript
interface ResourceConfig {
  maxConcurrentSteps: number;
  memoryAllocation: string;
  cpuAllocation: string;
  ioBandwidth: string;
}
```

### Caching Strategy

Intelligent caching for pipeline optimization:

```
Data Access
    ↓
Cache Check
    ↓
Cache Hit/Miss Decision
    ↓
Data Retrieval
    ↓
Cache Update (if needed)
```

### Batch Processing

Optimized batch processing for large datasets:

```typescript
interface BatchConfig {
  batchSize: number;
  maxBatchSize: number;
  batchTimeout: string;
  processingStrategy: 'streaming' | 'bulk';
}
```

## Security Architecture

### Access Control

Role-based access control for pipeline operations:

```typescript
interface AccessContext {
  userId: string;
  roles: string[];
  permissions: string[];
  pipelineAccess: Record<string, AccessLevel>;
}
```

### Data Protection

Secure handling of sensitive pipeline data:

```
Data Input
    ↓
Encryption Check
    ↓
Access Validation
    ↓
Data Processing
    ↓
Output Protection
    ↓
Audit Logging
```

### Webhook Security

Secure webhook processing:

```typescript
interface WebhookSecurity {
  authentication: 'hmac-sha256' | 'jwt' | 'api-key';
  secret: string;
  allowedIPs?: string[];
  rateLimit?: RateLimitConfig;
}
```

## Extensibility Architecture

### Custom Step Types

Extensible step type system for custom operations:

```typescript
interface CustomStepType {
  name: string;
  executor: StepExecutor;
  validator: StepValidator;
  config?: StepConfigSchema;
}
```

### Custom Sources

Extensible source types for new trigger mechanisms:

```typescript
interface CustomSourceType {
  name: string;
  handler: SourceHandler;
  validator: SourceValidator;
  config?: SourceConfigSchema;
}
```

### Plugin System

Modular plugin architecture for extending functionality:

```typescript
interface PipelinePlugin {
  name: string;
  version: string;
  hooks: PluginHooks;
  middleware?: PipelineMiddleware[];
}
```

## Testing Architecture

### Unit Testing

Comprehensive unit testing framework:

```typescript
interface TestSuite {
  pipeline: PipelineDefinition;
  mockData: Record<string, unknown>;
  expectedOutputs: Record<string, unknown>;
  testSteps: StepTest[];
}
```

### Integration Testing

End-to-end integration testing:

```typescript
interface IntegrationTest {
  environment: TestEnvironment;
  externalServices: MockService[];
  testData: TestDataGenerator;
  assertions: Assertion[];
}
```

### Performance Testing

Load testing and performance benchmarking:

```typescript
interface PerformanceTest {
  loadProfile: LoadProfile;
  duration: string;
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
}
```

This architecture ensures the Pipelines SDK is robust, scalable, and extensible while providing comprehensive data pipeline management capabilities with graph entity awareness and substrate orchestration.
