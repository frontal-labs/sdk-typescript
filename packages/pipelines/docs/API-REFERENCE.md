# API Reference

## PipelinesService

The main client class for interacting with the Frontal Pipelines service.

### Constructor

```typescript
new PipelinesService(http: HttpClient)
```

Creates a new PipelinesService instance with an HTTP client.

**Parameters:**
- `http`: HTTP client instance from `frontal/core`

**Example:**
```typescript
import { PipelinesService } from "@frontal-labs/pipelines";
import { getDefaultClient } from "frontal/core";

const pipelines = new PipelinesService(getDefaultClient()._http);
```

### Methods

#### define

```typescript
define(name: string): PipelineBuilder
```

Creates a new pipeline builder for defining a pipeline.

**Parameters:**
- `name`: The name of the pipeline

**Returns:** `PipelineBuilder` instance for building the pipeline

**Example:**
```typescript
const builder = pipelines.define("my-pipeline");
```

#### pipeline

```typescript
pipeline(id: string): PipelineAccessor
```

Returns an accessor for managing a specific pipeline.

**Parameters:**
- `id`: The ID of the pipeline

**Returns:** `PipelineAccessor` instance for the specified pipeline

**Example:**
```typescript
const pipelineAccessor = pipelines.pipeline("pipeline-123");
const pipeline = await pipelineAccessor.get();
```

#### list

```typescript
list(opts?: { status?: PipelineStatus; limit?: number; cursor?: string }): Promise<PageResult<Pipeline>>
```

Lists all pipelines with optional filtering.

**Parameters:**
- `opts` (optional): List options including status, pagination

**Returns:** Promise resolving to paginated pipeline list

**Example:**
```typescript
const activePipelines = await pipelines.list({
  status: "active",
  limit: 20
});
```

#### create

```typescript
create(definition: PipelineDefinition): Promise<Pipeline>
```

Creates a new pipeline from a definition.

**Parameters:**
- `definition`: Pipeline definition object

**Returns:** Promise resolving to the created pipeline

**Example:**
```typescript
const pipeline = await pipelines.create({
  name: "data-processing",
  description: "Process incoming data",
  source: { type: "webhook", config: { url: "https://api.example.com/webhook" } },
  steps: [
    { id: "collect", type: "collect", config: { batchSize: 100 } },
    { id: "transform", type: "transform", config: { processor: "cleanup" } }
  ]
});
```

## PipelineBuilder

Fluent builder for constructing pipeline definitions.

### Constructor

```typescript
new PipelineBuilder(name: string, http: HttpClient)
```

### Configuration Methods

#### description

```typescript
description(text: string): this
```

Sets the pipeline description.

**Parameters:**
- `text`: Description text

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.description("Processes user activity events");
```

#### schedule

```typescript
schedule(cron: string): this
```

Sets the pipeline execution schedule using cron syntax.

**Parameters:**
- `cron`: Cron expression for scheduling

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.schedule("0 */5 * * * *"); // Every 5 minutes
```

#### timeout

```typescript
timeout(duration: string): this
```

Sets the pipeline timeout duration.

**Parameters:**
- `duration`: Timeout duration (e.g., "10m", "1h", "30s")

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.timeout("15m");
```

#### retryPolicy

```typescript
retryPolicy(policy: 'linear' | 'exponential' | 'none'): this
```

Sets the retry policy for the pipeline.

**Parameters:**
- `policy`: Retry policy type

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.retryPolicy("exponential");
```

#### errorHandling

```typescript
errorHandling(strategy: 'fail' | 'skip' | 'retry'): this
```

Sets the error handling strategy.

**Parameters:**
- `strategy`: Error handling strategy

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.errorHandling("skip");
```

#### tags

```typescript
tags(...tags: string[]): this
```

Adds tags to the pipeline for organization and filtering.

**Parameters:**
- `tags`: Array of tag strings

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.tags("analytics", "real-time", "user-data");
```

### Source Methods

#### source

```typescript
source(source: PipelineSource): this
```

Sets the data source for the pipeline.

**Parameters:**
- `source`: Pipeline source configuration

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.source({
  type: "webhook",
  config: { url: "https://api.example.com/webhook" }
});
```

#### fromGraph

```typescript
fromGraph(entityType: string, filter?: Record<string, unknown>): this
```

Configures the pipeline to source from graph entity changes.

**Parameters:**
- `entityType`: Graph entity type to monitor
- `filter` (optional): Filter conditions for entities

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.fromGraph("user", { status: "active", lastSeen: { gte: "2024-01-01" } });
```

#### fromWebhook

```typescript
fromWebhook(url: string, config?: Record<string, unknown>): this
```

Configures the pipeline to trigger from webhook events.

**Parameters:**
- `url`: Webhook URL
- `config` (optional): Additional webhook configuration

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.fromWebhook("https://api.example.com/webhook", {
  secret: process.env.WEBHOOK_SECRET,
  authentication: "hmac-sha256"
});
```

#### fromSchedule

```typescript
fromSchedule(cron: string): this
```

Configures the pipeline to trigger on a schedule.

**Parameters:**
- `cron`: Cron expression for scheduling

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.fromSchedule("0 2 * * *"); // Daily at 2 AM
```

#### fromManual

```typescript
fromManual(): this
```

Configures the pipeline to trigger manually only.

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.fromManual();
```

### Step Methods

#### collect

```typescript
collect(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a data collection step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options including next step, conditions, timeout

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.collect("raw-events", {
  batchSize: 1000,
  window: "5m"
}, {
  next: "transform-data",
  timeout: "10m"
});
```

#### transform

```typescript
transform(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a data transformation step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.transform("enrich-data", {
  userFields: ["name", "email"],
  enrichmentSources: ["crm", "analytics"]
});
```

#### enrich

```typescript
enrich(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a data enrichment step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.enrich("geo-enrichment", {
  ipField: "clientIP",
  enrichFields: ["country", "city", "timezone"]
});
```

#### validate

```typescript
validate(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a data validation step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.validate("quality-check", {
  rules: ["required-fields", "valid-email", "positive-timestamp"]
});
```

#### write

```typescript
write(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a data write step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.write("processed-events", {
  destination: "analytics_events",
  format: "json"
});
```

#### notify

```typescript
notify(id: string, config?: Record<string, unknown>, opts?: { next?: string; condition?: string; timeout?: string }): this
```

Adds a notification step to the pipeline.

**Parameters:**
- `id`: Step identifier
- `config` (optional): Step configuration
- `opts` (optional): Step options

**Returns:** Builder instance for chaining

**Example:**
```typescript
builder.notify("slack-alert", {
  webhook: "https://hooks.slack.com/...",
  condition: "errorCount > 0"
});
```

### Creation Methods

#### create

```typescript
create(): Promise<Pipeline>
```

Creates the pipeline with the current builder configuration.

**Returns:** Promise resolving to the created pipeline

**Example:**
```typescript
const pipeline = await builder.create();
```

#### activate

```typescript
activate(): Promise<Pipeline>
```

Creates and activates the pipeline in one step.

**Returns:** Promise resolving to the activated pipeline

**Example:**
```typescript
const activePipeline = await builder.activate();
```

## PipelineAccessor

Provides operations for managing a specific pipeline.

### Constructor

```typescript
new PipelineAccessor(id: string, http: HttpClient)
```

### Methods

#### get

```typescript
get(): Promise<Pipeline>
```

Retrieves the pipeline definition and current status.

**Returns:** Promise resolving to the pipeline

**Example:**
```typescript
const pipeline = await pipelineAccessor.get();
```

#### update

```typescript
update(definition: Partial<PipelineDefinition>): Promise<Pipeline>
```

Updates an existing pipeline.

**Parameters:**
- `definition`: Partial pipeline definition with changes

**Returns:** Promise resolving to the updated pipeline

**Example:**
```typescript
const updated = await pipelineAccessor.update({
  description: "Updated description",
  timeout: "20m"
});
```

#### delete

```typescript
delete(): Promise<void>
```

Deletes a pipeline.

**Returns:** Promise resolving when deletion is complete

**Example:**
```typescript
await pipelineAccessor.delete();
```

#### runs

```typescript
runs(opts?: { status?: RunStatus; limit?: number; cursor?: string }): Promise<PageResult<PipelineRun>>
```

Gets the execution runs for the pipeline.

**Parameters:**
- `opts` (optional): Filter options for runs

**Returns:** Promise resolving to paginated run list

**Example:**
```typescript
const recentRuns = await pipelineAccessor.runs({
  status: "completed",
  limit: 50
});
```

#### run

```typescript
run(runId: string): Promise<PipelineRun>
```

Retrieves details of a specific pipeline run.

**Parameters:**
- `runId`: ID of the pipeline run

**Returns:** Promise resolving to the pipeline run details

**Example:**
```typescript
const runDetails = await pipelineAccessor.run("run-123");
```

#### trigger

```typescript
trigger(input?: Record<string, unknown>): Promise<PipelineRun>
```

Manually triggers a pipeline execution.

**Parameters:**
- `input` (optional): Input data for the pipeline run

**Returns:** Promise resolving to the triggered pipeline run

**Example:**
```typescript
const run = await pipelineAccessor.trigger({
  reportMonth: "2024-01",
  includeCharts: true
});
```

#### backfills

```typescript
backfills(opts?: { status?: string; limit?: number; cursor?: string }): Promise<PageResult<Backfill>>
```

Gets the backfill operations for the pipeline.

**Parameters:**
- `opts` (optional): Filter options for backfills

**Returns:** Promise resolving to paginated backfill list

**Example:**
```typescript
const backfills = await pipelineAccessor.backfills({
  status: "completed"
});
```

#### backfill

```typescript
backfill(from: string, to: string, opts?: { strategy?: 'full' | 'incremental'; dryRun?: boolean }): Promise<Backfill>
```

Initiates a backfill operation for historical data.

**Parameters:**
- `from`: Start date for backfill (ISO string)
- `to`: End date for backfill (ISO string)
- `opts` (optional): Backfill options

**Returns:** Promise resolving to the backfill operation

**Example:**
```typescript
const backfill = await pipelineAccessor.backfill("2024-01-01", "2024-01-31", {
  strategy: "incremental",
  dryRun: false
});
```

#### health

```typescript
health(): Promise<PipelineHealth>
```

Gets the health status and metrics for the pipeline.

**Returns:** Promise resolving to pipeline health information

**Example:**
```typescript
const health = await pipelineAccessor.health();
console.log(`Health status: ${health.status}`);
```

## LineageNamespace

Handles data lineage and dependency tracking.

### Constructor

```typescript
new LineageNamespace(http: HttpClient)
```

### Methods

#### graph

```typescript
graph(opts?: { pipelineIds?: string[]; entityType?: string; from?: string; to?: string }): Promise<LineageGraph>
```

Retrieves the data lineage graph.

**Parameters:**
- `opts` (optional): Filter options for the lineage graph

**Returns:** Promise resolving to the lineage graph

**Example:**
```typescript
const lineage = await pipelines.lineage.graph({
  pipelineIds: ["pipeline-1", "pipeline-2"],
  entityType: "customer"
});
```

#### upstream

```typescript
upstream(entityType: string, entityId: string): Promise<{ pipelines: Pipeline[]; entities: any[] }>
```

Finds upstream dependencies for an entity.

**Parameters:**
- `entityType`: Type of the entity
- `entityId`: ID of the entity

**Returns:** Promise resolving to upstream dependencies

**Example:**
```typescript
const upstream = await pipelines.lineage.upstream("customer", "12345");
console.log("Upstream pipelines:", upstream.pipelines);
```

#### downstream

```typescript
downstream(entityType: string, entityId: string): Promise<{ pipelines: Pipeline[]; entities: any[] }>
```

Finds downstream consumers for an entity.

**Parameters:**
- `entityType`: Type of the entity
- `entityId`: ID of the entity

**Returns:** Promise resolving to downstream consumers

**Example:**
```typescript
const downstream = await pipelines.lineage.downstream("processed_events", "batch-001");
console.log("Downstream entities:", downstream.entities);
```

## Types

### PipelineDefinition

Complete pipeline definition structure.

```typescript
interface PipelineDefinition {
  name: string;
  description?: string;
  source: PipelineSource;
  steps: PipelineStep[];
  schedule?: string;
  timeout?: string;
  retryPolicy?: 'linear' | 'exponential' | 'none';
  errorHandling?: 'fail' | 'skip' | 'retry';
  tags?: string[];
}
```

### PipelineSource

Pipeline trigger source configuration.

```typescript
interface PipelineSource {
  type: 'graph-entity' | 'webhook' | 'schedule' | 'manual';
  entityType?: string;
  filter?: Record<string, unknown>;
  config?: Record<string, unknown>;
}
```

### PipelineStep

Individual pipeline step definition.

```typescript
interface PipelineStep {
  id: string;
  type: 'collect' | 'transform' | 'enrich' | 'validate' | 'write' | 'notify';
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  dependsOn?: string[];
  condition?: string;
  timeout?: string;
  retry?: RetryConfig;
}
```

### Pipeline

Complete pipeline with runtime information.

```typescript
interface Pipeline extends PipelineDefinition {
  id: string;
  version: number;
  status: 'draft' | 'active' | 'paused' | 'deprecated';
  lastRun?: {
    id: string;
    status: RunStatus;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### PipelineRun

Pipeline execution run details.

```typescript
interface PipelineRun {
  id: string;
  pipelineId: string;
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  context?: Record<string, unknown>;
  stepRuns: Array<{
    stepId: string;
    status: RunStatus;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    output?: Record<string, unknown>;
    error?: string;
  }>;
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}
```

### Backfill

Historical data backfill operation.

```typescript
interface Backfill {
  id: string;
  pipelineId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  from: string;
  to: string;
  strategy: 'full' | 'incremental';
  dryRun: boolean;
  processed: number;
  total: number;
  errors?: Array<{
    timestamp: string;
    entity: Record<string, unknown>;
    error: string;
  }>;
  createdAt: string;
  completedAt?: string;
}
```

### LineageGraph

Data lineage graph structure.

```typescript
interface LineageGraph {
  nodes: Array<{
    id: string;
    type: 'pipeline' | 'entity' | 'dataset';
    name: string;
    metadata?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'data-flow' | 'dependency' | 'produces';
    metadata?: Record<string, unknown>;
  }>;
  lastUpdated: string;
}
```

### PipelineHealth

Pipeline health and performance metrics.

```typescript
interface PipelineHealth {
  pipelineId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRun: {
    status: RunStatus;
    completedAt: string;
    durationMs: number;
    success: boolean;
  };
  recentRuns: Array<{
    id: string;
    status: RunStatus;
    completedAt: string;
    durationMs: number;
    success: boolean;
  }>;
  metrics: {
    avgRunTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
  }>;
}
```

### Enums

#### PipelineStatus

```typescript
type PipelineStatus = 'draft' | 'active' | 'paused' | 'deprecated';
```

#### RunStatus

```typescript
type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

#### StepType

```typescript
type StepType = 'collect' | 'transform' | 'enrich' | 'validate' | 'write' | 'notify';
```

#### SourceType

```typescript
type SourceType = 'graph-entity' | 'webhook' | 'schedule' | 'manual';
```

## Utility Functions

### createPipelinesClient

```typescript
createPipelinesClient(client: FrontalClient): PipelinesService
```

Creates a PipelinesService instance with a custom FrontalClient.

**Parameters:**
- `client`: FrontalClient instance

**Returns:** PipelinesService instance

**Example:**
```typescript
import { createPipelinesClient } from "@frontal-labs/pipelines";
import { FrontalClient } from "frontal/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const pipelines = createPipelinesClient(client);
```

## Default Export

The package also exports a default pipelines instance configured with environment variables:

```typescript
import { pipelines } from "@frontal-labs/pipelines";

// Use the default instance
const pipelineList = await pipelines.list();
```
