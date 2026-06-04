# Developer Guide

This guide covers advanced usage patterns, best practices, and common scenarios when working with the Frontal Functions SDK.

## Table of Contents

- [Advanced Configuration](#advanced-configuration)
- [Function Development Patterns](#function-development-patterns)
- [Error Handling Strategies](#error-handling-strategies)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)
- [Testing Your Functions](#testing-your-functions)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Advanced Configuration

### Custom HTTP Client

You can configure the Functions SDK with a custom HTTP client for advanced scenarios:

```typescript
import { Functions } from "@frontal-labs/functions";

const functions = new Functions({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev",
  timeout: 30000,        // 30 seconds timeout
  maxRetries: 3,         // Retry failed requests 3 times
  retryDelay: 1000,      // Wait 1 second between retries
  headers: {
    "x-user-agent": "my-app/1.0.0",
    "x-debug": "true"
  }
});
```

### Environment-Specific Configuration

Set up different configurations for development and production:

```typescript
import { configure } from "@frontal-labs/functions";

const config = {
  apiKey: process.env.FRONTAL_API_KEY,
  baseUrl: process.env.NODE_ENV === "production" 
    ? "https://api.frontal.dev"
    : "https://api-staging.frontal.dev"
};

configure(config);
```

## Function Development Patterns

### 1. HTTP API Functions

Create RESTful API endpoints:

```typescript
// api-function.ts
export const handler = async (event: {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}) => {
  // Route based on HTTP method
  switch (event.method) {
    case "GET":
      return handleGet(event.path);
    case "POST":
      return handlePost(event.path, event.body);
    default:
      return { statusCode: 405, body: "Method not allowed" };
  }
};

async function handleGet(path: string) {
  if (path === "/users") {
    return { statusCode: 200, body: JSON.stringify([{ id: 1, name: "John" }]) };
  }
  return { statusCode: 404, body: "Not found" };
}

async function handlePost(path: string, body: unknown) {
  // Process POST request
  return { statusCode: 201, body: JSON.stringify({ success: true }) };
}
```

### 2. Scheduled Functions

Create functions that run on a schedule:

```typescript
// scheduled-function.ts
export const handler = async () => {
  // Daily cleanup task
  const results = await cleanupOldRecords();
  
  return {
    message: `Cleaned up ${results.deletedCount} records`,
    timestamp: new Date().toISOString()
  };
};

async function cleanupOldRecords() {
  // Your cleanup logic here
  return { deletedCount: 42 };
}
```

### 3. Queue-Processing Functions

Process messages from queues:

```typescript
// queue-function.ts
export const handler = async (event: {
  records: Array<{
    messageId: string;
    body: string;
    attributes: Record<string, string>;
  }>;
}) => {
  const results = [];
  
  for (const record of event.records) {
    try {
      const result = await processMessage(record.body);
      results.push({ messageId: record.messageId, success: true, result });
    } catch (error) {
      results.push({ 
        messageId: record.messageId, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return { processed: results.length, results };
};

async function processMessage(body: string) {
  const data = JSON.parse(body);
  // Process the message
  return { processed: true, data };
}
```

### 4. Webhook Functions

Handle webhook events:

```typescript
// webhook-function.ts
import crypto from "crypto";

export const handler = async (event: {
  headers: Record<string, string>;
  body: string;
}) => {
  // Verify webhook signature
  const signature = event.headers["x-webhook-signature"];
  if (!verifySignature(event.body, signature)) {
    return { statusCode: 401, body: "Invalid signature" };
  }
  
  const payload = JSON.parse(event.body);
  
  // Handle different event types
  switch (payload.type) {
    case "user.created":
      await handleUserCreated(payload.data);
      break;
    case "payment.completed":
      await handlePaymentCompleted(payload.data);
      break;
    default:
      console.log(`Unhandled event type: ${payload.type}`);
  }
  
  return { statusCode: 200, body: "Webhook processed" };
};

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  
  return signature === expectedSignature;
}
```

## Error Handling Strategies

### Structured Error Responses

Create consistent error responses:

```typescript
class FunctionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "FunctionError";
  }
}

export const handler = async (event: any) => {
  try {
    // Your function logic
    const result = await processRequest(event);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    if (error instanceof FunctionError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({
          error: error.code,
          message: error.message
        })
      };
    }
    
    // Handle unexpected errors
    console.error("Unexpected error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      })
    };
  }
};
```

### Retry Logic

Implement retry logic for external dependencies:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw new Error("Max retries exceeded");
}
```

## Performance Optimization

### Memory Management

Optimize memory usage for your functions:

```typescript
// Use streams for large files
import { createReadStream } from "fs";

export const handler = async (event: { filePath: string }) => {
  const stream = createReadStream(event.filePath);
  
  // Process file in chunks
  for await (const chunk of stream) {
    await processChunk(chunk);
  }
  
  return { processed: true };
};

// Clean up resources
export const handler = async (event: any) => {
  const resources = [];
  
  try {
    // Allocate resources
    const db = await connectDatabase();
    resources.push(db);
    
    const cache = await connectCache();
    resources.push(cache);
    
    // Your logic here
    return await processRequest(event, db, cache);
  } finally {
    // Clean up resources
    for (const resource of resources) {
      await resource.close();
    }
  }
};
```

### Cold Start Optimization

Minimize cold start times:

```typescript
// Initialize connections outside the handler
let dbConnection: Database;

export const handler = async (event: any) => {
  if (!dbConnection) {
    dbConnection = await connectDatabase();
  }
  
  return await processRequest(event, dbConnection);
};
```

## Security Best Practices

### Input Validation

Always validate input data:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

export const handler = async (event: { body: string }) => {
  try {
    const userData = UserSchema.parse(JSON.parse(event.body));
    
    // Process validated data
    const user = await createUser(userData);
    
    return { statusCode: 201, body: JSON.stringify(user) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "VALIDATION_ERROR",
          details: error.errors
        })
      };
    }
    throw error;
  }
};
```

### Environment Variable Security

Handle sensitive data securely:

```typescript
// Use environment variables for sensitive data
const config = {
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  jwtSecret: process.env.JWT_SECRET
};

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "API_KEY", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

### Rate Limiting

Implement rate limiting for API functions:

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const handler = async (event: { headers: Record<string, string> }) => {
  const clientId = event.headers["x-client-id"] || "anonymous";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;
  
  let clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(clientId, clientData);
  }
  
  clientData.count++;
  
  if (clientData.count > maxRequests) {
    return {
      statusCode: 429,
      body: JSON.stringify({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests"
      })
    };
  }
  
  // Process the request
  return await processRequest(event);
};
```

## Testing Your Functions

### Unit Testing

Test your function logic in isolation:

```typescript
// handler.test.ts
import { describe, it, expect } from "bun:test";
import { handler } from "./handler";

describe("handler", () => {
  it("should process valid request", async () => {
    const event = {
      body: JSON.stringify({ name: "John", email: "john@example.com" })
    };
    
    const result = await handler(event);
    
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.name).toBe("John");
  });
  
  it("should reject invalid input", async () => {
    const event = {
      body: JSON.stringify({ name: "", email: "invalid" })
    };
    
    const result = await handler(event);
    
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
```

### Integration Testing

Test the deployed function:

```typescript
// integration.test.ts
import { describe, it, expect } from "bun:test";
import { invoke } from "@frontal-labs/functions";

describe("deployed function", () => {
  it("should handle real requests", async () => {
    const response = await invoke("my-function", {
      payload: { test: true }
    });
    
    expect(response).toBeDefined();
    // Add your assertions here
  });
});
```

## Monitoring and Debugging

### Structured Logging

Use structured logging for better observability:

```typescript
export const handler = async (event: any) => {
  const requestId = generateRequestId();
  
  console.log(JSON.stringify({
    event: "function.start",
    requestId,
    timestamp: new Date().toISOString(),
    input: sanitizeInput(event)
  }));
  
  try {
    const result = await processRequest(event);
    
    console.log(JSON.stringify({
      event: "function.success",
      requestId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    }));
    
    return result;
  } catch (error) {
    console.error(JSON.stringify({
      event: "function.error",
      requestId,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }));
    
    throw error;
  }
};
```

### Performance Monitoring

Track performance metrics:

```typescript
export const handler = async (event: any) => {
  const startTime = Date.now();
  const memoryBefore = process.memoryUsage();
  
  try {
    const result = await processRequest(event);
    
    const duration = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    
    console.log(JSON.stringify({
      metric: "function.performance",
      duration,
      memoryUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      memoryTotal: memoryAfter.heapUsed
    }));
    
    return result;
  } catch (error) {
    console.error(JSON.stringify({
      metric: "function.error",
      duration: Date.now() - startTime,
      error: error.message
    }));
    
    throw error;
  }
};
```

## Common Use Cases

### 1. Data Processing Pipeline

```typescript
export const handler = async (event: {
  records: Array<{ id: string; data: unknown }>;
}) => {
  const results = [];
  
  for (const record of event.records) {
    // Transform data
    const transformed = await transformData(record.data);
    
    // Validate transformed data
    const validated = await validateData(transformed);
    
    // Store result
    const stored = await storeData(validated);
    
    results.push({ id: record.id, success: true, result: stored });
  }
  
  return { processed: results.length, results };
};
```

### 2. Image Processing

```typescript
import sharp from "sharp";

export const handler = async (event: {
  imageUrl: string;
  width?: number;
  height?: number;
  format?: "jpeg" | "png" | "webp";
}) => {
  const response = await fetch(event.imageUrl);
  const buffer = await response.arrayBuffer();
  
  let transformer = sharp(Buffer.from(buffer));
  
  if (event.width || event.height) {
    transformer = transformer.resize(event.width, event.height, {
      fit: "inside",
      withoutEnlargement: true
    });
  }
  
  const format = event.format || "jpeg";
  const processedBuffer = await transformer
    .toFormat(format, { quality: 80 })
    .toBuffer();
  
  // Upload processed image
  const url = await uploadImage(processedBuffer, `processed.${format}`);
  
  return { url, size: processedBuffer.length, format };
};
```

### 3. Email Service

```typescript
export const handler = async (event: {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
}) => {
  const recipients = Array.isArray(event.to) ? event.to : [event.to];
  
  // Generate email content from template
  const html = await renderTemplate(event.template, event.data);
  const text = await renderTemplate(`${event.template}.text`, event.data);
  
  // Send email
  const results = await Promise.allSettled(
    recipients.map(recipient => 
      sendEmail({ to: recipient, subject: event.subject, html, text })
    )
  );
  
  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;
  
  return {
    sent: successful,
    failed,
    total: recipients.length
  };
};
```

## Troubleshooting

### Common Issues

1. **Cold Start Delays**
   - Initialize connections outside the handler
   - Keep initialization code minimal
   - Use provisioned concurrency for critical functions

2. **Memory Leaks**
   - Clean up resources in finally blocks
   - Avoid global variables that accumulate data
   - Monitor memory usage in logs

3. **Timeout Errors**
   - Increase timeout configuration
   - Implement async processing with queues
   - Break large tasks into smaller chunks

4. **Authentication Failures**
   - Verify API key configuration
   - Check environment variable names
   - Ensure proper header formatting

### Debugging Tips

```typescript
// Enable debug mode
const DEBUG = process.env.DEBUG === "true";

function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

export const handler = async (event: any) => {
  debugLog("Function invoked", { event });
  
  try {
    const result = await processRequest(event);
    debugLog("Processing completed", { result });
    return result;
  } catch (error) {
    debugLog("Processing failed", { error: error.message, stack: error.stack });
    throw error;
  }
};
```

This guide provides comprehensive coverage of advanced patterns and best practices for developing robust, scalable functions with the Frontal Functions SDK.
