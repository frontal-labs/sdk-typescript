# Developer Guide

This guide covers advanced usage patterns, best practices, and common scenarios when working with the Frontal Pipelines SDK.

## Table of Contents

- [Advanced Pipeline Patterns](#advanced-pipeline-patterns)
- [Error Handling Strategies](#error-handling-strategies)
- [Performance Optimization](#performance-optimization)
- [Conditional Pipeline Logic](#conditional-pipeline-logic)
- [Pipeline Dependencies](#pipeline-dependencies)
- [Data Lineage Management](#data-lineage-management)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Backfill Operations](#backfill-operations)
- [Testing Pipeline Logic](#testing-pipeline-logic)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Advanced Pipeline Patterns

### Multi-Source Pipeline

Combine multiple data sources in a single pipeline:

```typescript
const multiSourcePipeline = await pipelines.define("multi-source-analytics")
  .description("Combine data from multiple sources for analytics")
  .fromSchedule("0 */10 * * *") // Every 10 minutes
  .collect("web-events", {
    source: "webhook",
    window: "10m",
    batchSize: 500
  })
  .collect("mobile-events", {
    source: "mobile-app",
    window: "10m",
    batchSize: 300
  })
  .transform("merge-sources", {
    mergeStrategy: "union",
    deduplicate: ["sessionId", "eventId"],
    timestampField: "eventTime"
  })
  .enrich("user-context", {
    enrichFields: ["userProfile", "preferences"],
    cacheKey: "userId",
    cacheTTL: "1h"
  })
  .validate("data-quality", {
    rules: ["required-fields", "valid-timestamp", "user-exists"],
    errorThreshold: 0.05 // Allow 5% error rate
  })
  .write("unified-analytics", {
    destination: "analytics_events_unified",
    format: "json",
    partitionBy: ["date", "eventType"]
  })
  .retryPolicy("exponential")
  .timeout("30m")
  .tags("analytics", "multi-source", "real-time")
  .create();
```

### Fan-Out Processing

Distribute processing across multiple parallel paths:

```typescript
const fanOutPipeline = await pipelines.define("fan-out-processing")
  .description("Process data through multiple parallel paths")
  .fromGraph("raw_transaction", {
    status: "pending",
    timestamp: { gte: "now-1h" }
  })
  .collect("transactions", {
    batchSize: 1000,
    window: "5m"
  })
  .transform("route-by-type", {
    routingField: "transactionType",
    routes: {
      "payment": "payment-processing",
      "refund": "refund-processing", 
      "dispute": "dispute-processing",
      "default": "default-processing"
    }
  })
  // Parallel payment processing
  .transform("payment-processing", {
    condition: "transactionType === 'payment'",
    config: {
      validatePayment: true,
      checkFraud: true,
      updateBalance: true
    }
  })
  .write("payment-processed", {
    condition: "transactionType === 'payment'",
    destination: "processed_payments"
  })
  // Parallel refund processing
  .transform("refund-processing", {
    condition: "transactionType === 'refund'",
    config: {
      validateRefund: true,
      checkPolicy: true,
      processRefund: true
    }
  })
  .write("refund-processed", {
    condition: "transactionType === 'refund'",
    destination: "processed_refunds"
  })
  // Parallel dispute processing
  .transform("dispute-processing", {
    condition: "transactionType === 'dispute'",
    config: {
      validateDispute: true,
      gatherEvidence: true,
      createCase: true
    }
  })
  .write("dispute-processed", {
    condition: "transactionType === 'dispute'",
    destination: "processed_disputes"
  })
  // Default processing
  .transform("default-processing", {
    condition: "transactionType !== 'payment' && transactionType !== 'refund' && transactionType !== 'dispute'",
    config: {
      logUnknown: true,
      routeToManual: true
    }
  })
  .write("unknown-processed", {
    condition: "transactionType !== 'payment' && transactionType !== 'refund' && transactionType !== 'dispute'",
    destination: "unknown_transactions"
  })
  .notify("processing-complete", {
    condition: "stepStatus === 'completed'",
    config: {
      channels: ["slack", "email"],
      template: "transaction-processed",
      includeMetrics: true
    }
  })
  .create();
```

### Aggregation Pipeline

Build complex aggregation pipelines:

```typescript
const aggregationPipeline = await pipelines.define("hourly-aggregations")
  .description("Generate hourly analytics aggregations")
  .fromSchedule("0 * * * *") // Every hour
  .collect("raw-events", {
    timeRange: "last-1h",
    sources: ["page_views", "clicks", "conversions"],
    sampling: {
      rate: 0.1, // 10% sampling for large datasets
      seed: "fixed-seed"
    }
  })
  .transform("session-aggregation", {
    groupBy: ["sessionId", "userId"],
    aggregations: {
      pageViews: "count",
      sessionDuration: "max(timestamp) - min(timestamp)",
      uniquePages: "count_distinct(pageUrl)",
      conversions: "sum(conversionValue)"
    },
    window: "session"
  })
  .transform("user-aggregation", {
    groupBy: ["userId"],
    aggregations: {
      totalSessions: "count",
      totalPageViews: "sum(pageViews)",
      avgSessionDuration: "avg(sessionDuration)",
      totalConversions: "sum(conversions)"
    }
  })
  .transform("page-aggregation", {
    groupBy: ["pageUrl"],
    aggregations: {
      uniqueVisitors: "count_distinct(userId)",
      totalViews: "count",
      avgTimeOnPage: "avg(timeOnPage)",
      bounceRate: "sum(isBounce) / count()"
    }
  })
  .enrich("comparative-metrics", {
    compareWith: "previous-hour",
    metrics: ["sessions", "pageViews", "conversions"],
    calculateGrowth: true
  })
  .write("hourly-analytics", {
    destination: "analytics_hourly",
    format: "parquet",
    partitionBy: ["hour", "date"]
  })
  .write("realtime-dashboard", {
    destination: "dashboard_metrics",
    format: "json",
    realtime: true
  })
  .notify("aggregation-complete", {
    condition: "errorCount > 0",
    config: {
      channels: ["slack"],
      message: "Hourly aggregation completed with {{errorCount}} errors"
    }
  })
  .retryPolicy("linear")
  .timeout("45m")
  .tags("analytics", "aggregation", "hourly")
  .create();
```

## Error Handling Strategies

### Circuit Breaker Pattern

Implement circuit breaker for external service calls:

```typescript
const resilientPipeline = await pipelines.define("resilient-processing")
  .description("Process data with circuit breaker protection")
  .fromWebhook("https://api.example.com/webhook", {
    secret: process.env.WEBHOOK_SECRET,
    rateLimit: {
      requests: 1000,
      window: "1m"
    }
  })
  .transform("validate-input", {
    schema: "input-schema-v1",
    strict: true
  })
  .transform("external-api-call", {
    config: {
      endpoint: "https://external-service.com/api/process",
      timeout: "30s",
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: "60s",
        halfOpenMaxCalls: 3
      },
      retry: {
        maxAttempts: 3,
        backoff: "exponential",
        baseDelay: "1s"
      }
    }
  })
  .transform("fallback-processing", {
    condition: "circuitBreakerState === 'open'",
    config: {
      useCache: true,
      cacheKey: "processed-data",
      cacheTTL: "1h",
      logFallback: true
    }
  })
  .validate("output-validation", {
    rules: ["required-fields", "data-integrity"],
    continueOnError: true
  })
  .write("processed-data", {
    destination: "processed_data",
    format: "json"
  })
  .notify("error-alert", {
    condition: "circuitBreakerState === 'open' || errorRate > 0.1",
    config: {
      channels: ["slack", "pagerduty"],
      severity: "critical",
      escalationPolicy: {
        level1: { delay: "5m", recipients: ["oncall-engineer"] },
        level2: { delay: "15m", recipients: ["team-lead"] },
        level3: { delay: "30m", recipients: ["engineering-manager"] }
      }
    }
  })
  .retryPolicy("exponential")
  .errorHandling("skip")
  .timeout("10m")
  .create();
```

### Dead Letter Queue Pattern

Handle failed records with dead letter queue:

```typescript
const dlqPipeline = await pipelines.define("dlq-processing")
  .description("Process data with dead letter queue handling")
  .fromGraph("incoming_data", {
    status: "pending"
  })
  .collect("data-batch", {
    batchSize: 100,
    window: "1m"
  })
  .transform("process-data", {
    config: {
      processor: "main-processor",
      timeout: "30s",
      maxRetries: 3
    },
    errorHandling: {
      strategy: "dlq",
      dlqDestination: "failed_data_dlq",
      dlqMaxSize: 10000,
      dlqTTL: "7d"
    }
  })
  .validate("quality-check", {
    rules: ["schema-validation", "business-rules"],
    errorHandling: {
      strategy: "separate",
      validDestination: "valid_data",
      invalidDestination: "invalid_data"
    }
  })
  .write("processed-data", {
    destination: "processed_data",
    format: "json"
  })
  .notify("dlq-alert", {
    condition: "dlqSize > 1000 || dlqAge > '24h'",
    config: {
      channels: ["slack"],
      message: "DLQ size: {{dlqSize}}, Oldest record: {{dlqAge}}",
      includeMetrics: true
    }
  })
  .create();
```

## Performance Optimization

### Batch Processing Optimization

Optimize batch sizes for different data volumes:

```typescript
class OptimizedBatchProcessor {
  private calculateOptimalBatchSize(dataVolume: number, avgRecordSize: number): number {
    // Dynamic batch sizing based on data characteristics
    const memoryLimit = 1024 * 1024 * 1024; // 1GB
    const maxRecordsByMemory = Math.floor(memoryLimit / avgRecordSize);
    
    // Consider processing time constraints
    const maxRecordsByTime = 10000; // 10k records per batch max
    
    // Consider API limits
    const apiLimit = 5000;
    
    return Math.min(maxRecordsByMemory, maxRecordsByTime, apiLimit);
  }
  
  async createOptimizedPipeline(): Promise<void> {
    const dataProfile = await this.analyzeDataCharacteristics();
    const optimalBatchSize = this.calculateOptimalBatchSize(
      dataProfile.volume, 
      dataProfile.avgRecordSize
    );
    
    const pipeline = await pipelines.define("optimized-batch-processing")
      .description("Optimized batch processing with dynamic sizing")
      .fromSchedule("*/15 * * * *") // Every 15 minutes
      .collect("data-batch", {
        batchSize: optimalBatchSize,
        adaptiveSizing: true,
        sizingMetrics: ["throughput", "error-rate", "processing-time"],
        sizingWindow: "1h"
      })
      .transform("parallel-processing", {
        parallelism: 4,
        chunkSize: Math.floor(optimalBatchSize / 4),
        loadBalancing: "round-robin"
      })
      .write("processed-data", {
        destination: "optimized_processed",
        format: "parquet",
        compression: "snappy"
      })
      .timeout("20m")
      .create();
  }
}
```

### Memory-Efficient Processing

Process large datasets with minimal memory usage:

```typescript
const streamingPipeline = await pipelines.define("streaming-processor")
  .description("Memory-efficient streaming data processing")
  .fromGraph("large_dataset", {
    incremental: true,
    watermarkField: "processedAt"
  })
  .collect("streaming-chunks", {
    strategy: "streaming",
    chunkSize: 1000,
    memoryLimit: "512MB",
    spillToDisk: true,
    spillPath: "/tmp/pipeline-spill"
  })
  .transform("streaming-transform", {
    processor: "streaming-processor",
    bufferConfig: {
      inputBufferSize: 1000,
      outputBufferSize: 1000,
      flushInterval: "5s"
    },
    memoryManagement: {
      gcInterval: "30s",
      maxMemoryUsage: "400MB",
      enableProfiling: true
    }
  })
  .transform("aggregate-streaming", {
    aggregations: {
      count: "running_count",
      sum: "running_sum",
      min: "running_min",
      max: "running_max"
    },
    windowSize: 10000,
    emitInterval: "1m"
  })
  .write("streaming-output", {
    destination: "streaming_results",
    format: "json",
    writeMode: "append",
    batchSize: 500
  })
  .notify("memory-alert", {
    condition: "memoryUsage > '450MB' || gcFrequency > '1/min'",
    config: {
      channels: ["slack"],
      message: "Memory usage: {{memoryUsage}}, GC frequency: {{gcFrequency}}"
    }
  })
  .timeout("60m")
  .create();
```

## Conditional Pipeline Logic

### Dynamic Routing

Route data based on complex conditions:

```typescript
const dynamicRoutingPipeline = await pipelines.define("dynamic-routing")
  .description("Route data based on complex business logic")
  .fromWebhook("https://api.example.com/webhook")
  .collect("incoming-data", {
    batchSize: 100
  })
  .transform("route-analysis", {
    routingRules: [
      {
        condition: "amount > 10000 && customerTier === 'premium'",
        route: "high-value-processing",
        priority: 1
      },
      {
        condition: "amount > 1000 && riskScore < 50",
        route: "standard-processing", 
        priority: 2
      },
      {
        condition: "riskScore >= 80",
        route: "high-risk-review",
        priority: 0 // Highest priority
      },
      {
        condition: "isInternational === true",
        route: "international-processing",
        priority: 3
      },
      {
        condition: "default", // Catch-all
        route: "default-processing",
        priority: 10
      }
    ]
  })
  // High-value processing
  .transform("high-value-processing", {
    condition: "selectedRoute === 'high-value-processing'",
    config: {
      enhancedValidation: true,
      manualReview: false,
      priorityProcessing: true,
      notifications: ["account-manager", "compliance"]
    }
  })
  .write("high-value-output", {
    condition: "selectedRoute === 'high-value-processing'",
    destination: "high_value_processed"
  })
  // High-risk review
  .transform("high-risk-review", {
    condition: "selectedRoute === 'high-risk-review'",
    config: {
      holdForReview: true,
      escalationLevel: "manager",
      additionalChecks: ["fraud-detection", "compliance-review"]
    }
  })
  .write("high-risk-held", {
    condition: "selectedRoute === 'high-risk-review'",
    destination: "high_risk_held"
  })
  // Standard processing
  .transform("standard-processing", {
    condition: "selectedRoute === 'standard-processing'",
    config: {
      standardValidation: true,
      autoApprove: true
    }
  })
  .write("standard-output", {
    condition: "selectedRoute === 'standard-processing'",
    destination: "standard_processed"
  })
  // International processing
  .transform("international-processing", {
    condition: "selectedRoute === 'international-processing'",
    config: {
      currencyConversion: true,
      complianceChecks: ["sanctions", "aml"],
      internationalFees: true
    }
  })
  .write("international-output", {
    condition: "selectedRoute === 'international-processing'",
    destination: "international_processed"
  })
  // Default processing
  .transform("default-processing", {
    condition: "selectedRoute === 'default-processing'",
    config: {
      basicValidation: true,
      logForReview: true
    }
  })
  .write("default-output", {
    condition: "selectedRoute === 'default-processing'",
    destination: "default_processed"
  })
  .create();
```

### Time-Based Conditional Logic

Execute different logic based on time patterns:

```typescript
const timeBasedPipeline = await pipelines.define("time-based-processing")
  .description("Execute different logic based on time patterns")
  .fromSchedule("*/5 * * * *") // Every 5 minutes
  .collect("time-sensitive-data", {
    window: "5m"
  })
  .transform("time-routing", {
    timeRules: [
      {
        condition: "hour >= 9 && hour < 17 && dayOfWeek >= 1 && dayOfWeek <= 5",
        route: "business-hours",
        config: {
          priority: "high",
          sla: "5m",
          notifications: ["team-lead"]
        }
      },
      {
        condition: "hour >= 17 && hour < 22",
        route: "after-hours",
        config: {
          priority: "medium",
          sla: "30m",
          notifications: ["oncall"]
        }
      },
      {
        condition: "hour >= 22 || hour < 6",
        route: "overnight",
        config: {
          priority: "low",
          sla: "2h",
          batchProcessing: true,
          notifications: []
        }
      },
      {
        condition: "dayOfWeek >= 6", // Weekend
        route: "weekend",
        config: {
          priority: "low",
          sla: "4h",
          reducedProcessing: true
        }
      }
    ]
  })
  .transform("business-hours-processing", {
    condition: "timeRoute === 'business-hours'",
    config: {
      realTimeProcessing: true,
      immediateNotifications: true,
      fullValidation: true
    }
  })
  .transform("after-hours-processing", {
    condition: "timeRoute === 'after-hours'",
    config: {
      batchProcessing: true,
      delayedNotifications: true,
      essentialValidationOnly: true
    }
  })
  .transform("overnight-processing", {
    condition: "timeRoute === 'overnight'",
    config: {
      largeBatches: true,
      minimalProcessing: true,
      morningNotifications: true
    }
  })
  .transform("weekend-processing", {
    condition: "timeRoute === 'weekend'",
    config: {
      maintenanceMode: true,
      emergencyOnly: true,
      mondayCatchup: true
    }
  })
  .write("time-processed", {
    destination: "time_processed_data",
    format: "json"
  })
  .create();
```

## Pipeline Dependencies

### Complex Dependency Chains

Build pipelines with complex interdependencies:

```typescript
const dependencyChain = await pipelines.define("dependency-chain")
  .description("Complex pipeline with multiple dependency levels")
  .fromSchedule("0 2 * * *") // Daily at 2 AM
  // Level 1: Raw data collection
  .collect("raw-user-data", {
    dependsOn: [], // No dependencies
    source: "user_events",
    window: "24h"
  })
  .collect("raw-order-data", {
    dependsOn: [], // No dependencies
    source: "order_events", 
    window: "24h"
  })
  .collect("raw-product-data", {
    dependsOn: [], // No dependencies
    source: "product_events",
    window: "24h"
  })
  // Level 2: Basic processing
  .transform("process-user-data", {
    dependsOn: ["raw-user-data"],
    config: {
      deduplication: true,
      validation: "user-schema",
      enrichment: ["profile", "preferences"]
    }
  })
  .transform("process-order-data", {
    dependsOn: ["raw-order-data"],
    config: {
      validation: "order-schema",
      enrichment: ["customer", "product"]
    }
  })
  .transform("process-product-data", {
    dependsOn: ["raw-product-data"],
    config: {
      validation: "product-schema",
      enrichment: ["inventory", "pricing"]
    }
  })
  // Level 3: Advanced processing
  .transform("generate-user-insights", {
    dependsOn: ["process-user-data", "process-order-data"],
    config: {
      behavioralAnalysis: true,
      segmentation: true,
      lifetimeValue: true
    }
  })
  .transform("generate-product-insights", {
    dependsOn: ["process-product-data", "process-order-data"],
    config: {
      salesAnalysis: true,
      inventoryOptimization: true,
      pricingRecommendations: true
    }
  })
  // Level 4: Aggregation
  .transform("daily-aggregations", {
    dependsOn: ["generate-user-insights", "generate-product-insights"],
    config: {
      userMetrics: ["active", "new", "retained"],
      productMetrics: ["sales", "views", "conversions"],
      orderMetrics: ["volume", "value", "average"]
    }
  })
  // Level 5: Output
  .write("user-insights", {
    dependsOn: ["generate-user-insights"],
    destination: "user_insights_daily"
  })
  .write("product-insights", {
    dependsOn: ["generate-product-insights"],
    destination: "product_insights_daily"
  })
  .write("daily-reports", {
    dependsOn: ["daily-aggregations"],
    destination: "daily_reports"
  })
  .notify("completion-alert", {
    dependsOn: ["daily-reports"],
    condition: "allStepsCompleted",
    config: {
      channels: ["slack", "email"],
      recipients: ["data-team", "management"],
      includeMetrics: true
    }
  })
  .timeout("4h")
  .retryPolicy("exponential")
  .create();
```

### Cross-Pipeline Dependencies

Coordinate multiple related pipelines:

```typescript
// Create data preparation pipeline
const dataPrepPipeline = await pipelines.define("data-preparation")
  .description("Prepare data for downstream processing")
  .fromSchedule("0 1 * * *") // Daily at 1 AM
  .collect("raw-data", {
    sources: ["source1", "source2", "source3"],
    window: "24h"
  })
  .transform("clean-and-validate", {
    config: {
      cleaning: true,
      validation: true,
      standardization: true
    }
  })
  .write("prepared-data", {
    destination: "prepared_for_processing"
  })
  .notify("prep-complete", {
    condition: "status === 'completed'",
    config: {
      triggerPipelines: ["user-analytics", "order-analytics", "inventory-analytics"],
      message: "Data preparation completed, triggering downstream pipelines"
    }
  })
  .create();

// Create dependent analytics pipelines
const userAnalyticsPipeline = await pipelines.define("user-analytics")
  .description("User behavior analytics")
  .fromGraph("prepared_data", {
    status: "ready",
    waitForPipeline: "data-preparation"
  })
  .collect("user-data", {
    filter: { dataType: "user" }
  })
  .transform("user-analytics", {
    config: {
      behavioralAnalysis: true,
      segmentation: true,
      trends: true
    }
  })
  .write("user-analytics", {
    destination: "user_analytics"
  })
  .create();
```

## Data Lineage Management

### Comprehensive Lineage Tracking

Track complete data flow across systems:

```typescript
class LineageManager {
  async setupLineageAwarePipelines(): Promise<void> {
    // Create source pipeline with lineage tracking
    const sourcePipeline = await pipelines.define("source-with-lineage")
      .description("Source pipeline with comprehensive lineage tracking")
      .fromGraph("source_entities")
      .collect("source-data", {
        lineageTracking: {
          enabled: true,
          captureMetadata: true,
          trackTransformations: true,
          recordTimestamps: true
        }
      })
      .transform("source-transform", {
        config: {
          lineage: {
            recordInputIds: true,
            recordOutputIds: true,
            transformationDescription: "Source data normalization"
          }
        }
      })
      .write("source-output", {
        destination: "source_processed",
        lineage: {
          registerDataset: true,
          datasetMetadata: {
            source: "primary-database",
            freshness: "real-time",
            schemaVersion: "v1.2"
          }
        }
      })
      .create();

    // Create downstream pipeline that consumes lineage
    const downstreamPipeline = await pipelines.define("downstream-with-lineage")
      .description("Downstream pipeline consuming lineage data")
      .fromGraph("source_processed", {
        lineageFilter: {
          upstreamPipelines: ["source-with-lineage"],
          dataFreshness: "1h",
          qualityScore: 0.95
        }
      })
      .collect("downstream-data", {
        lineageContext: {
          includeUpstreamMetadata: true,
          includeTransformationHistory: true,
          includeQualityMetrics: true
        }
      })
      .transform("downstream-transform", {
        config: {
          lineage: {
            inheritUpstreamLineage: true,
            addTransformationStep: "Downstream enrichment",
            preserveDataProvenance: true
          }
        }
      })
      .write("downstream-output", {
        destination: "downstream_processed",
        lineage: {
          updateLineageGraph: true,
          createNewDatasetVersion: true
        }
      })
      .create();
  }

  async analyzeDataImpact(entityType: string, entityId: string): Promise<void> {
    // Get upstream dependencies
    const upstream = await pipelines.lineage.upstream(entityType, entityId);
    
    // Get downstream consumers  
    const downstream = await pipelines.lineage.downstream(entityType, entityId);
    
    // Analyze impact of changes
    const impactAnalysis = {
      affectedPipelines: [...upstream.pipelines, ...downstream.pipelines],
      affectedEntities: [...upstream.entities, ...downstream.entities],
      criticality: this.assessCriticality(upstream, downstream),
      recommendedActions: this.generateRecommendations(upstream, downstream)
    };
    
    // Notify stakeholders
    await this.notifyImpactAnalysis(impactAnalysis);
  }

  private assessCriticality(upstream: any, downstream: any): string {
    const upstreamCritical = upstream.pipelines.some(p => p.tags?.includes("critical"));
    const downstreamCritical = downstream.pipelines.some(p => p.tags?.includes("critical"));
    const consumerCount = downstream.pipelines.length;
    
    if (upstreamCritical && downstreamCritical) return "high";
    if (consumerCount > 10) return "high";
    if (upstreamCritical || downstreamCritical) return "medium";
    return "low";
  }
}
```

### Lineage-Based Impact Analysis

Analyze impact of data changes:

```typescript
const impactAnalysisPipeline = await pipelines.define("impact-analysis")
  .description("Analyze impact of data changes across the ecosystem")
  .fromManual()
  .collect("change-request", {
    input: "change-request-data"
  })
  .transform("analyze-impact", {
    config: {
      lineageAnalysis: {
        getUpstreamDependencies: true,
        getDownstreamConsumers: true,
        calculateImpactScope: true,
        assessCriticality: true
      },
      impactMetrics: {
        affectedPipelines: "count",
        affectedEntities: "count", 
        dataVolume: "estimate",
        processingTime: "estimate"
      }
    }
  })
  .validate("impact-validation", {
    rules: ["change-allowed", "no-breaking-changes", "proper-approval"],
    condition: "impactLevel !== 'critical'"
  })
  .transform("generate-impact-report", {
    config: {
      includeLineageGraph: true,
      includeRecommendations: true,
      includeRollbackPlan: true
    }
  })
  .write("impact-reports", {
    destination: "impact_analysis_reports"
  })
  .notify("impact-notification", {
    condition: "impactLevel === 'high' || impactLevel === 'critical'",
    config: {
      channels: ["slack", "email", "pagerduty"],
      recipients: ["data-owners", "stakeholders"],
      escalationPolicy: {
        high: { delay: "15m", recipients: ["data-lead"] },
        critical: { delay: "5m", recipients: ["engineering-manager"] }
      }
    }
  })
  .create();
```

## Monitoring and Alerting

### Comprehensive Health Monitoring

Implement detailed pipeline health monitoring:

```typescript
const healthMonitoringPipeline = await pipelines.define("health-monitor")
  .description("Monitor health of all critical pipelines")
  .fromSchedule("*/10 * * * *") // Every 10 minutes
  .collect("pipeline-health-data", {
    sources: ["pipeline-metrics", "system-metrics"],
    timeRange: "10m"
  })
  .transform("analyze-health", {
    config: {
      healthChecks: [
        {
          name: "success-rate",
          threshold: { warning: 0.95, critical: 0.90 },
          calculation: "successful_runs / total_runs"
        },
        {
          name: "average-runtime",
          threshold: { warning: "5m", critical: "10m" },
          calculation: "avg(duration_ms)"
        },
        {
          name: "error-rate",
          threshold: { warning: 0.05, critical: 0.10 },
          calculation: "failed_runs / total_runs"
        },
        {
          name: "throughput",
          threshold: { warning: 100, critical: 50 },
          calculation: "records_processed / minute"
        }
      ],
      aggregationWindow: "1h",
      trendAnalysis: true
    }
  })
  .transform("generate-alerts", {
    config: {
      alertRules: [
        {
          condition: "any(health_check === 'critical')",
          severity: "critical",
          channels: ["pagerduty", "slack", "phone"],
          escalationDelay: "5m"
        },
        {
          condition: "any(health_check === 'warning')",
          severity: "warning", 
          channels: ["slack", "email"],
          escalationDelay: "30m"
        },
        {
          condition: "trend === 'degrading'",
          severity: "warning",
          channels: ["slack"],
          message: "Pipeline health is trending downward"
        }
      ]
    }
  })
  .write("health-metrics", {
    destination: "pipeline_health_metrics"
  })
  .notify("health-alerts", {
    condition: "hasAlerts",
    config: {
      channels: ["slack"],
      template: "health-alert",
      includeMetrics: true,
      includeTrends: true
    }
  })
  .create();
```

### Performance Benchmarking

Track and benchmark pipeline performance:

```typescript
const performanceBenchmarkPipeline = await pipelines.define("performance-benchmark")
  .description("Benchmark pipeline performance against historical baselines")
  .fromSchedule("0 3 * * *") // Daily at 3 AM
  .collect("performance-data", {
    timeRange: "24h",
    metrics: [
      "runtime",
      "throughput", 
      "error-rate",
      "resource-usage",
      "data-quality-score"
    ]
  })
  .transform("calculate-benchmarks", {
    config: {
      baselineComparison: {
        period: "30d", // Compare with last 30 days
        percentiles: [50, 90, 95, 99],
        statisticalTests: ["t-test", "anova"]
      },
      performanceClassification: {
        excellent: { threshold: "95th-percentile", color: "green" },
        good: { threshold: "90th-percentile", color: "blue" },
        acceptable: { threshold: "75th-percentile", color: "yellow" },
        poor: { threshold: "<75th-percentile", color: "red" }
      }
    }
  })
  .transform("generate-performance-report", {
    config: {
      includeCharts: true,
      includeTrends: true,
      includeRecommendations: true,
      benchmarkCategories: ["speed", "reliability", "efficiency", "quality"]
    }
  })
  .write("performance-reports", {
    destination: "performance_benchmarks"
  })
  .notify("performance-alert", {
    condition: "performanceGrade === 'poor' || significantRegression",
    config: {
      channels: ["slack", "email"],
      recipients: ["performance-team", "pipeline-owners"],
      includeActionItems: true
    }
  })
  .create();
```

## Backfill Operations

### Smart Backfill Strategy

Implement intelligent backfill with optimization:

```typescript
const smartBackfillPipeline = await pipelines.define("smart-backfill")
  .description("Intelligent backfill with optimization and monitoring")
  .fromManual()
  .collect("backfill-request", {
    input: "backfill-parameters"
  })
  .transform("analyze-backfill-scope", {
    config: {
      dataVolumeAnalysis: true,
      resourceEstimation: true,
      timeOptimization: true,
      partitionStrategy: "auto"
    }
  })
  .transform("optimize-backfill-plan", {
    config: {
      parallelization: {
        enabled: true,
        maxWorkers: 10,
        workerResourceAllocation: "auto"
      },
      batching: {
        optimalBatchSize: true,
        adaptiveBatching: true,
        memoryOptimization: true
      },
      scheduling: {
        offHours: true,
        resourcePriority: "low",
        interferenceAvoidance: true
      }
    }
  })
  .transform("execute-backfill", {
    config: {
      executionStrategy: "incremental",
      checkpointing: true,
      resumeOnError: true,
      progressTracking: true
    }
  })
  .validate("backfill-validation", {
    rules: ["data-completeness", "data-accuracy", "referential-integrity"],
    sampleRate: 0.01 // Validate 1% of processed data
  })
  .write("backfilled-data", {
    destination: "backfilled_dataset",
    format: "parquet",
    partitionBy: ["date", "source"]
  })
  .transform("generate-backfill-report", {
    config: {
      includeMetrics: true,
      includePerformanceStats: true,
      includeQualityResults: true,
      recommendations: true
    }
  })
  .write("backfill-reports", {
    destination: "backfill_reports"
  })
  .notify("backfill-complete", {
    condition: "status === 'completed'",
    config: {
      channels: ["slack", "email"],
      recipients: ["data-team", "stakeholders"],
      includeSummary: true
    }
  })
  .timeout("24h")
  .retryPolicy("exponential")
  .create();

// Usage example
const backfill = await pipelines.pipeline("smart-backfill").trigger({
  backfillType: "historical",
  dateRange: {
    from: "2024-01-01",
    to: "2024-01-31"
  },
  datasets: ["user_events", "order_events", "product_events"],
  priority: "normal",
  dryRun: false
});
```

### Incremental Backfill with Change Detection

Implement incremental backfill with change detection:

```typescript
const incrementalBackfillPipeline = await pipelines.define("incremental-backfill")
  .description("Incremental backfill with change detection")
  .fromManual()
  .collect("backfill-scope", {
    input: "incremental-backfill-params"
  })
  .transform("detect-changes", {
    config: {
      changeDetection: {
        method: "checksum-and-timestamp",
        checksumFields: ["id", "last_modified"],
        timestampField: "updated_at",
        changeThreshold: 0.01 // 1% change threshold
      },
      incrementalStrategy: {
        primaryKey: "id",
        lastProcessedField: "last_processed_id",
        batchSize: 5000,
        checkpointInterval: 10000
      }
    }
  })
  .transform("process-changes", {
    condition: "hasChanges",
    config: {
      changeTypes: ["insert", "update", "delete"],
      conflictResolution: "latest-wins",
      auditLogging: true
    }
  })
  .transform("merge-incremental", {
    condition: "hasChanges",
    config: {
      mergeStrategy: "upsert",
      conflictDetection: true,
      validation: "post-merge"
    }
  })
  .write("incremental-output", {
    condition: "hasChanges",
    destination: "incremental_backfilled"
  })
  .transform("update-checkpoints", {
    config: {
      checkpointTable: "backfill_checkpoints",
      updateLastProcessed: true,
      recordStatistics: true
    }
  })
  .notify("incremental-complete", {
    condition: "status === 'completed'",
    config: {
      channels: ["slack"],
      message: "Incremental backfill completed: {{recordsProcessed}} records processed"
    }
  })
  .create();
```

## Testing Pipeline Logic

### Pipeline Testing Framework

Implement comprehensive testing for pipeline logic:

```typescript
class PipelineTester {
  async testPipelineWithMockData(
    pipelineDefinition: any,
    testData: any[]
  ): Promise<TestResult> {
    // Create test pipeline
    const testPipeline = await pipelines.define(`test-${Date.now()}`)
      .description("Test pipeline execution")
      .fromManual()
      .collect("test-data", {
        input: testData
      })
      // Copy the actual pipeline steps
      ...pipelineDefinition.steps.map(step => ({
        ...step,
        config: {
          ...step.config,
          testMode: true,
          dryRun: true
        }
      }))
      .write("test-output", {
        destination: "test_results"
      })
      .create();

    try {
      // Execute test pipeline
      const testRun = await testPipeline.trigger();
      
      // Wait for completion
      const result = await this.waitForCompletion(testRun.id);
      
      // Validate results
      const validation = await this.validateTestResults(result, testData);
      
      return {
        success: result.status === 'completed',
        executionTime: result.durationMs,
        recordsProcessed: result.output?.recordCount || 0,
        errors: result.error ? [result.error] : [],
        validationResults: validation,
        testRun: result
      };
      
    } finally {
      // Cleanup test pipeline
      await testPipeline.delete();
    }
  }

  async validateTestResults(result: any, testData: any[]): Promise<ValidationResult> {
    const validations = [
      {
        name: "record-count",
        expected: testData.length,
        actual: result.output?.recordCount || 0,
        passed: Math.abs((result.output?.recordCount || 0) - testData.length) < 5
      },
      {
        name: "data-integrity",
        test: (output: any) => {
          // Check for data integrity issues
          return this.checkDataIntegrity(output);
        },
        passed: true
      },
      {
        name: "schema-compliance",
        test: (output: any) => {
          return this.validateSchema(output);
        },
        passed: true
      }
    ];

    return {
      totalTests: validations.length,
      passedTests: validations.filter(v => v.passed).length,
      failedTests: validations.filter(v => !v.passed),
      details: validations
    };
  }
}
```

### Load Testing for Pipelines

Test pipeline performance under load:

```typescript
const loadTestPipeline = await pipelines.define("load-test")
  .description("Load test pipeline performance")
  .fromManual()
  .collect("load-test-config", {
    input: "load-test-parameters"
  })
  .transform("generate-test-data", {
    config: {
      dataGeneration: {
        recordCount: 100000,
        dataComplexity: "high",
        variability: true,
        realisticData: true
      }
    }
  })
  .transform("execute-load-test", {
    config: {
      loadTest: {
        concurrentExecutions: 10,
        duration: "30m",
        rampUpTime: "5m",
        resourceMonitoring: true,
        performanceMetrics: [
          "throughput",
          "latency",
          "error-rate",
          "resource-usage"
        ]
      }
    }
  })
  .transform("analyze-performance", {
    config: {
      performanceAnalysis: {
        baselineComparison: true,
        percentileAnalysis: [50, 90, 95, 99],
        trendDetection: true,
        bottleneckIdentification: true
      }
    }
  })
  .write("load-test-results", {
    destination: "load_test_results"
  })
  .notify("load-test-complete", {
    condition: "status === 'completed'",
    config: {
      channels: ["slack", "email"],
      recipients: ["performance-team"],
      includeRecommendations: true
    }
  })
  .create();
```

## Common Use Cases

### Real-Time Analytics Pipeline

Build real-time analytics with low latency:

```typescript
const realtimeAnalyticsPipeline = await pipelines.define("realtime-analytics")
  .description("Real-time analytics with sub-second latency")
  .fromGraph("user_events", {
    realtime: true,
    filter: { timestamp: { gte: "now-5s" } }
  })
  .collect("event-stream", {
    window: "5s",
    batchSize: 100,
    streaming: true
  })
  .transform("real-time-aggregation", {
    config: {
      aggregations: {
        activeUsers: "count_distinct(userId)",
        pageViews: "count()",
        conversions: "sum(conversionValue)",
        avgSessionDuration: "avg(sessionDuration)"
      },
      windowSize: "5s",
      slideInterval: "1s"
    }
  })
  .enrich("real-time-context", {
    config: {
      enrichFields: ["userSegment", "geoLocation", "deviceType"],
      cacheStrategy: "lru",
      cacheTTL: "30s"
    }
  })
  .write("realtime-metrics", {
    destination: "realtime_analytics",
    format: "json",
    realtime: true,
    lowLatency: true
  })
  .notify("realtime-alerts", {
    condition: "errorRate > 0.01 || latency > '1s'",
    config: {
      channels: ["slack"],
      urgency: "high",
      autoEscalation: true
    }
  })
  .timeout("30s")
  .retryPolicy("none") // No retries for real-time
  .create();
```

### Data Governance Pipeline

Implement comprehensive data governance:

```typescript
const dataGovernancePipeline = await pipelines.define("data-governance")
  .description("Comprehensive data governance and compliance")
  .fromSchedule("0 4 * * *") // Daily at 4 AM
  .collect("governance-scope", {
    sources: ["all_datasets"],
    timeRange: "24h"
  })
  .transform("privacy-scan", {
    config: {
      privacyChecks: [
        "pii-detection",
        "phi-detection", 
        "credit-card-detection",
        "ssn-detection"
      ],
      maskingRules: {
        email: "partial-mask",
        phone: "partial-mask",
        ssn: "full-mask"
      }
    }
  })
  .transform("compliance-check", {
    config: {
      regulations: ["gdpr", "ccpa", "hipaa"],
      complianceRules: [
        "data-retention",
        "consent-management",
        "right-to-deletion",
        "data-portability"
      ]
    }
  })
  .transform("quality-assessment", {
    config: {
      qualityDimensions: [
        "completeness",
        "accuracy", 
        "consistency",
        "timeliness",
        "validity"
      ],
      qualityThresholds: {
        overall: 0.95,
        critical: 0.98
      }
    }
  })
  .validate("governance-validation", {
    rules: ["privacy-compliance", "regulatory-compliance", "quality-standards"],
    condition: "allChecksPassed"
  })
  .write("governance-report", {
    destination: "governance_reports"
  })
  .write("compliance-metrics", {
    destination: "compliance_metrics"
  })
  .notify("governance-alerts", {
    condition: "complianceScore < 0.95 || privacyViolations > 0",
    config: {
      channels: ["slack", "email", "compliance-officer"],
      severity: "high",
      includeDetails: true,
      requireAcknowledgment: true
    }
  })
  .timeout("2h")
  .retryPolicy("linear")
  .tags("governance", "compliance", "privacy", "quality")
  .create();
```

## Troubleshooting

### Common Issues and Solutions

1. **Pipeline Performance Issues**
   - Monitor resource usage and identify bottlenecks
   - Optimize batch sizes and parallelism
   - Consider data partitioning strategies

2. **Memory Leaks in Streaming**
   - Implement proper buffer management
   - Use streaming processors with backpressure
   - Monitor garbage collection patterns

3. **Dependency Resolution Failures**
   - Verify step dependencies are correctly defined
   - Check for circular dependencies
   - Use dependency visualization tools

4. **Data Quality Degradation**
   - Implement comprehensive validation rules
   - Monitor quality metrics over time
   - Set up automated quality alerts

5. **Backfill Performance**
   - Use incremental backfill strategies
   - Optimize resource allocation
   - Implement checkpointing for resume capability

### Debugging Tools

```typescript
class PipelineDebugger {
  async analyzePipelineFailure(pipelineId: string, runId: string): Promise<FailureAnalysis> {
    const run = await pipelines.pipeline(pipelineId).run(runId);
    const pipeline = await pipelines.pipeline(pipelineId).get();
    
    const analysis = {
      failurePoint: this.identifyFailurePoint(run),
      rootCause: this.analyzeRootCause(run),
      affectedSteps: this.getAffectedSteps(run),
      recommendations: this.generateRecommendations(run, pipeline),
      recoveryOptions: this.getRecoveryOptions(pipeline)
    };
    
    return analysis;
  }

  async performanceBottleneckAnalysis(pipelineId: string): Promise<BottleneckAnalysis> {
    const health = await pipelines.pipeline(pipelineId).health();
    const recentRuns = await pipelines.pipeline(pipelineId).runs({
      limit: 100
    });
    
    return {
      slowestSteps: this.identifySlowestSteps(recentRuns),
      resourceBottlenecks: this.identifyResourceBottlenecks(health),
      optimizationOpportunities: this.findOptimizationOpportunities(recentRuns),
      recommendations: this.generatePerformanceRecommendations(health, recentRuns)
    };
  }
}
```

This comprehensive guide provides advanced patterns and best practices for building sophisticated data pipelines with the Frontal Pipelines SDK.
