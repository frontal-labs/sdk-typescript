# @frontal/pipelines

The **Frontal Pipelines SDK** provides a powerful declarative system for building, orchestrating, and managing data pipelines with substrate orchestration and graph entity awareness. It enables you to create complex data workflows with type safety and intelligent automation.

## Key Features

- **Declarative Pipeline Definition**: Build pipelines using a fluent, type-safe builder pattern
- **Multi-Source Support**: Trigger pipelines from graph entities, webhooks, schedules, or manual execution
- **Rich Step Types**: Collect, transform, enrich, validate, write, and notify operations
- **Graph Entity Integration**: Native support for graph database entities as data sources
- **Lineage Tracking**: Complete data lineage and dependency management
- **Backfill Operations**: Historical data processing with incremental or full strategies
- **Health Monitoring**: Real-time pipeline health and performance metrics
- **Error Handling**: Configurable retry policies and error handling strategies

## Installation

```bash
bun add @frontal/pipelines
```

## Quick Start

### Define a Simple Pipeline

```typescript
import { pipelines } from "@frontal/pipelines";

// Create a data processing pipeline
const pipeline = await pipelines.define("user-activity-processing")
  .description("Process user activity events and generate insights")
  .fromGraph("activity_event", {
    eventType: "user_action",
    timestamp: { gte: "2024-01-01" }
  })
  .collect("raw-events", {
    batchSize: 1000,
    window: "5m"
  })
  .transform("enrich-user-data", {
    userFields: ["name", "email", "profile"],
    enrichmentSources: ["crm", "analytics"]
  })
  .validate("data-quality-check", {
    rules: ["required-fields", "valid-email", "positive-timestamp"]
  })
  .write("processed-events", {
    destination: "analytics_events",
    format: "json"
  })
  .notify("slack-alert", {
    webhook: "https://hooks.slack.com/...",
    condition: "errorCount > 0"
  })
  .schedule("0 */5 * * * *") // Every 5 minutes
  .retryPolicy("exponential")
  .errorHandling("skip")
  .tags("analytics", "user-data", "real-time")
  .create();
```

### Webhook-Triggered Pipeline

```typescript
const webhookPipeline = await pipelines.define("order-processing")
  .description("Process incoming orders from e-commerce platform")
  .fromWebhook("https://api.example.com/webhooks/orders", {
    secret: process.env.WEBHOOK_SECRET,
    authentication: "hmac-sha256"
  })
  .validate("order-validation", {
    rules: ["valid-customer", "payment-verified", "inventory-check"]
  })
  .transform("calculate-totals", {
    taxRate: 0.08,
    shippingRules: "standard"
  })
  .enrich("inventory-update", {
    decrementStock: true,
    reserveItems: true
  })
  .write("processed-orders", {
    destination: "order_fulfillment",
    format: "json"
  })
  .notify("email-confirmation", {
    template: "order-confirmation",
    recipients: ["customer", "fulfillment-team"]
  })
  .timeout("10m")
  .create();
```

### Manual Pipeline Execution

```typescript
const reportPipeline = await pipelines.define("monthly-report")
  .description("Generate monthly business reports")
  .fromManual()
  .collect("monthly-data", {
    timeRange: "last-30-days",
    sources: ["orders", "customers", "products"]
  })
  .transform("aggregate-metrics", {
    aggregations: ["revenue", "orders", "customers", "products"]
  })
  .write("monthly-reports", {
    destination: "business_intelligence",
    format: "csv"
  })
  .notify("email-reports", {
    template: "monthly-summary",
    recipients: ["executives", "finance-team"]
  })
  .create();

// Trigger manually
const run = await pipelines.pipeline("monthly-report").trigger({
  reportMonth: "2024-01",
  includeCharts: true
});
```

## Core Concepts

### Pipeline Structure

Pipelines consist of:

- **Source**: Where data comes from (graph entities, webhooks, schedules, manual)
- **Steps**: Processing stages (collect, transform, enrich, validate, write, notify)
- **Configuration**: Timeout, retry policies, error handling
- **Metadata**: Description, tags, scheduling

### Step Types

The SDK supports six types of pipeline steps:

1. **Collect**: Gather data from sources
2. **Transform**: Process and transform data
3. **Enrich**: Add additional data from external sources
4. **Validate**: Ensure data quality and business rules
5. **Write**: Output processed data to destinations
6. **Notify**: Send alerts and notifications

### Pipeline Sources

Multiple trigger types for different use cases:

```typescript
// Graph entity changes
.fromGraph("user", { status: "active" })

// Webhook events
.fromWebhook("https://api.example.com/webhook")

// Scheduled execution
.fromSchedule("0 2 * * *") // Daily at 2 AM

// Manual triggering
.fromManual()
```

### Pipeline Status

Pipelines have distinct lifecycle states:

- **draft**: Pipeline definition, not active
- **active**: Running and processing data
- **paused**: Temporarily suspended
- **deprecated**: No longer used, kept for history

## Advanced Features

### Conditional Pipeline Steps

Add conditional logic to pipeline execution:

```typescript
const conditionalPipeline = await pipelines.define("conditional-processing")
  .fromGraph("event")
  .collect("all-events")
  .transform("route-by-type", {
    condition: "eventType === 'high_priority'",
    next: "priority-processing"
  })
  .transform("standard-processing", {
    condition: "eventType !== 'high_priority'",
    next: "normal-processing"
  })
  .write("processed-events")
  .create();
```

### Pipeline Dependencies

Create dependencies between pipeline steps:

```typescript
const dependentPipeline = await pipelines.define("dependent-processing")
  .fromGraph("processed_data")
  .collect("input-data", {
    dependsOn: ["data-validation", "data-enrichment"]
  })
  .transform("final-processing")
  .write("final-output")
  .create();
```

### Backfill Operations

Process historical data with backfill operations:

```typescript
// Trigger a backfill for historical data
const backfill = await pipelines.pipeline("user-activity-processing")
  .backfill("2024-01-01", "2024-01-31", {
    strategy: "incremental",
    dryRun: false
  });

// Monitor backfill progress
console.log(`Backfill status: ${backfill.status}`);
console.log(`Progress: ${backfill.processed}/${backfill.total}`);
```

### Pipeline Health Monitoring

Monitor pipeline health and performance:

```typescript
const health = await pipelines.pipeline("user-activity-processing").health();

console.log("Pipeline Health:");
console.log(`Status: ${health.status}`);
console.log(`Success Rate: ${health.metrics.successRate}`);
console.log(`Average Runtime: ${health.metrics.avgRunTime}ms`);
console.log(`Throughput: ${health.metrics.throughput} records/hour`);

// Check for alerts
if (health.alerts.length > 0) {
  health.alerts.forEach(alert => {
    console.log(`${alert.level}: ${alert.message}`);
  });
}
```

### Data Lineage

Track data flow and dependencies:

```typescript
// Get lineage graph
const lineage = await pipelines.lineage.graph({
  pipelineIds: ["user-processing", "order-processing"],
  entityType: "customer"
});

// Find upstream dependencies
const upstream = await pipelines.lineage.upstream("customer", "12345");
console.log("Upstream pipelines:", upstream.pipelines);

// Find downstream consumers
const downstream = await pipelines.lineage.downstream("processed_events", "batch-001");
console.log("Downstream entities:", downstream.entities);
```

## Configuration

The Pipelines SDK automatically reads configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

Or configure programmatically:

```typescript
import { createPipelinesClient } from "@frontal/pipelines";
import { FrontalClient } from "@frontal/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

const pipelines = createPipelinesClient(client);
```

## Error Handling

Robust error handling with configurable strategies:

```typescript
const resilientPipeline = await pipelines.define("error-resilient")
  .fromWebhook("https://api.example.com/webhook")
  .retryPolicy("exponential") // Exponential backoff
  .errorHandling("retry") // Retry on failure
  .timeout("5m")
  .transform("process-data", {
    maxRetries: 3,
    retryDelay: "30s"
  })
  .validate("data-check", {
    continueOnError: true, // Continue pipeline on validation errors
    errorThreshold: 0.1 // Allow 10% error rate
  })
  .write("output")
  .notify("error-alert", {
    condition: "errorRate > 0.05",
    escalation: "team-leads"
  })
  .create();
```

## Use Cases

### Real-time Analytics Pipeline

Process streaming analytics data:

```typescript
const analyticsPipeline = await pipelines.define("real-time-analytics")
  .description("Process real-time user analytics")
  .fromGraph("page_view", {
    timestamp: { gte: "now-5m" } // Last 5 minutes
  })
  .collect("page-views", {
    window: "1m",
    aggregation: "count"
  })
  .transform("session-aggregation", {
    sessionTimeout: "30m",
    groupBy: ["userId", "sessionId"]
  })
  .enrich("geo-enrichment", {
    ipField: "clientIP",
    enrichFields: ["country", "city", "timezone"]
  })
  .write("analytics_sessions", {
    destination: "realtime_analytics",
    format: "json"
  })
  .schedule("*/1 * * * *") // Every minute
  .tags("analytics", "realtime", "user-behavior")
  .create();
```

### E-commerce Order Processing

Handle e-commerce order workflow:

```typescript
const orderPipeline = await pipelines.define("ecommerce-orders")
  .description("Process e-commerce orders end-to-end")
  .fromWebhook("https://shop.example.com/webhooks/orders")
  .validate("order-validation", {
    rules: ["customer-exists", "payment-valid", "inventory-available"]
  })
  .transform("order-processing", {
    calculateTax: true,
    applyDiscounts: true,
    generateOrderId: true
  })
  .enrich("inventory-reservation", {
    reserveItems: true,
    checkAvailability: true
  })
  .write("processed-orders", {
    destination: "order_fulfillment"
  })
  .notify("customer-confirmation", {
    template: "order-confirmation",
    delay: "5m"
  })
  .notify("fulfillment-alert", {
    webhook: "https://fulfillment.example.com/api/orders",
    condition: "orderTotal > 1000"
  })
  .retryPolicy("linear")
  .errorHandling("fail")
  .timeout("15m")
  .tags("ecommerce", "orders", "critical")
  .create();
```

### Data Quality Pipeline

Ensure data quality across systems:

```typescript
const qualityPipeline = await pipelines.define("data-quality")
  .description("Monitor and improve data quality")
  .fromSchedule("0 2 * * *") // Daily at 2 AM
  .collect("data-sources", {
    sources: ["users", "orders", "products"],
    sampleSize: 10000
  })
  .validate("quality-checks", {
    rules: [
      "completeness-check",
      "consistency-check", 
      "accuracy-check",
      "uniqueness-check"
    ]
  })
  .transform("quality-improvement", {
    standardizeFormats: true,
    fillMissingValues: true,
    correctErrors: true
  })
  .write("quality-reports", {
    destination: "data_governance"
  })
  .notify("quality-alerts", {
    condition: "qualityScore < 0.95",
    recipients: ["data-team", "compliance-officer"]
  })
  .tags("data-governance", "quality", "compliance")
  .create();
```

## Performance Considerations

- **Batch Processing**: Use appropriate batch sizes for your data volume
- **Windowing**: Configure time windows for streaming data processing
- **Timeouts**: Set reasonable timeouts for each pipeline step
- **Retry Policies**: Choose appropriate retry strategies (linear vs exponential)
- **Monitoring**: Regularly check pipeline health and performance metrics

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand the system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns and best practices
