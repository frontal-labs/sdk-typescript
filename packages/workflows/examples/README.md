# Workflows Package Examples

This directory contains comprehensive examples demonstrating how to use the Frontal Workflows SDK for various workflow orchestration scenarios.

## Examples Overview

### 1. Basic Workflow Creation (`basic-workflow-creation.ts`)
Demonstrates fundamental workflow creation patterns including:
- Simple approval workflows
- Scheduled data processing pipelines
- Webhook-triggered workflows with parallel steps
- Workflow listing and execution triggering

**Key Concepts:**
- Workflow definition using the builder pattern
- Different trigger types (manual, schedule, webhook)
- Step dependencies and parallel execution
- Workflow activation and management

### 2. Approval Management (`approval-management.ts`)
Shows comprehensive approval workflow patterns:
- Multi-level approval processes
- Conditional approvals based on business rules
- Approval request management and processing
- Risk-based approval routing

**Key Concepts:**
- Approval step configuration
- Managing pending approvals
- Approval decision handling
- Conditional approval logic

### 3. Workflow Templates (`workflow-templates.ts`)
Illustrates template-based workflow creation:
- Creating reusable workflow templates
- Template categories and organization
- Using templates to instantiate workflows
- Template usage statistics and management

**Key Concepts:**
- Template definition and variables
- Template instantiation and customization
- Template lifecycle management
- Template-based workflow patterns

### 4. Advanced Workflow Patterns (`advanced-workflow-patterns.ts`)
Demonstrates sophisticated workflow capabilities:
- Complex parallel processing with synchronization
- Advanced conditional logic and error handling
- Dynamic workflow adaptation
- Comprehensive error recovery strategies

**Key Concepts:**
- Parallel execution patterns
- Complex conditional branching
- Error handling and retry policies
- Runtime workflow adaptation

## Running the Examples

Each example can be run independently using Bun:

```bash
# Run basic workflow creation example
bun run examples/basic-workflow-creation.ts

# Run approval management example
bun run examples/approval-management.ts

# Run workflow templates example
bun run examples/workflow-templates.ts

# Run advanced patterns example
bun run examples/advanced-workflow-patterns.ts
```

## Prerequisites

Before running the examples, ensure you have:

1. **Environment Configuration**: Set up your Frontal credentials in the environment:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

2. **Dependencies**: Install the required packages:
   ```bash
   bun install
   ```

3. **Permissions**: Ensure your API keys have the necessary permissions for:
   - Workflow creation and management
   - Approval processing
   - Template operations
   - Execution triggering

## Common Patterns

### Workflow Definition Pattern
```typescript
const workflow = await workflows
  .define("workflow-name")
  .description("Workflow description")
  .version("1.0.0")
  .tags("category", "tags")
  .manual() // or .schedule(), .event(), .webhook()
  .step("step-id", stepConfig)
  .create();
```

### Approval Pattern
```typescript
.approval("approval-id", ["approver@example.com"], {
  name: "Approval Name",
  description: "Approval description",
  timeout: "24h"
})
```

### Parallel Execution Pattern
```typescript
.parallel("parallel-group", ["step-1", "step-2", "step-3"])
.task("step-1", config)
.task("step-2", config)
.task("step-3", config)
```

### Conditional Logic Pattern
```typescript
.condition("condition-id", "expression", {
  dependsOn: ["previous-step"]
})
```

## Best Practices

1. **Use Descriptive Names**: Choose clear, descriptive names for workflows, steps, and conditions
2. **Implement Timeouts**: Set appropriate timeouts for approval and task steps
3. **Handle Errors**: Include error handling steps and retry policies where appropriate
4. **Use Templates**: Create templates for common workflow patterns to ensure consistency
5. **Monitor Executions**: Regularly check workflow execution status and handle failures
6. **Document Workflows**: Use descriptions and tags to make workflows discoverable

## Error Handling

The examples include comprehensive error handling patterns:

```typescript
try {
  const result = await workflows.operation();
  console.log("[SUCCESS]", result);
} catch (error) {
  console.error("[ERROR]", error);
}
```

## Next Steps

After exploring these examples:

1. **Modify Examples**: Adapt the examples to your specific use cases
2. **Create Templates**: Build templates for your organization's common workflows
3. **Integrate**: Integrate workflows with your existing systems and processes
4. **Monitor**: Set up monitoring and alerting for workflow executions
5. **Scale**: Design workflows that can handle your organization's scale requirements

## Support

For questions or issues with these examples:

1. Check the [Frontal Documentation](https://docs.frontal.dev)
2. Review the [API Reference](https://api.frontal.dev/docs)
3. Open an issue on the [GitHub Repository](https://github.com/frontal-cloud/sdk-ts)
4. Contact Frontal Support at support@frontal.dev
