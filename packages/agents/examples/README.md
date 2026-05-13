# Agents Package Examples

This directory contains comprehensive examples demonstrating how to use the Frontal Agents SDK for building intelligent AI agents with various capabilities and integrations.

## 📁 Example Files

### 🚀 [basic-agent.ts](./basic-agent.ts)
**Level:** Beginner  
**Features:** Simple message handling, sentiment analysis, memory storage

Demonstrates the fundamentals of creating an agent that:
- Responds to user messages with sentiment-based responses
- Stores conversation history in memory
- Uses basic reasoning for decision making
- Implements rate limiting and timeout configurations

**Use Case:** Customer service chatbots, simple automated responders

### 🔧 [advanced-agent.ts](./advanced-agent.ts)
**Level:** Advanced  
**Features:** Complex workflows, multi-step processing, escalation handling

Shows sophisticated agent capabilities including:
- Order processing with validation and inventory checks
- Payment processing and fraud detection
- Escalation workflows with human handoff
- Experiment management for A/B testing
- Advanced retry and error handling strategies

**Use Case:** E-commerce automation, complex business workflows

### 🔗 [langchain-integration.ts](./langchain-integration.ts)
**Level:** Intermediate  
**Features:** LangChain tools, custom agents, enhanced reasoning

Integrates LangChain for powerful AI capabilities:
- Custom tools for customer lookup and order management
- LangChain agents with ReAct pattern
- Complex order analysis (fraud, profitability, satisfaction)
- Tool-based decision making and automation

**Use Case:** Advanced customer service, intelligent data analysis

### ⚡ [vercel-ai-integration.ts](./vercel-ai-integration.ts)
**Level:** Intermediate  
**Features:** Vercel AI SDK, streaming responses, structured generation

Leverages Vercel AI SDK for modern AI workflows:
- Content generation with metadata analysis
- Real-time streaming chat responses
- Structured data analysis and visualization
- Multiple AI model integrations

**Use Case:** Content creation, real-time chat, data analytics

### 🧪 [testing-examples.ts](./testing-examples.ts)
**Level:** All levels  
**Features:** Unit tests, integration tests, performance testing

Comprehensive testing utilities and examples:
- Mock HTTP clients and agent contexts
- Test scenarios for different agent behaviors
- Performance testing utilities
- Unit and integration test examples

**Use Case:** Testing agent functionality, performance benchmarking

## 🛠️ Setup Instructions

### Prerequisites

1. **Agents SDK Setup**
   ```bash
   npm install @frontal/agents
   # or
   bun add @frontal/agents
   ```

2. **Environment Variables**
   ```env
   FRONTAL_API_URL=https://api.frontal.dev
   FRONTAL_API_KEY=your-api-key-here
   ```

3. **Optional Integrations**
   ```bash
   # For LangChain integration
   npm install @langchain/openai @langchain/core @langchain/langgraph langchain
   
   # For Vercel AI SDK integration
   npm install @ai-sdk/openai ai
   ```

### Running Examples

Each example can be run independently:

```bash
# Basic agent example
bun run packages/agents/examples/basic-agent.ts

# Advanced agent example
bun run packages/agents/examples/advanced-agent.ts

# LangChain integration
bun run packages/agents/examples/langchain-integration.ts

# Vercel AI integration
bun run packages/agents/examples/vercel-ai-integration.ts

# Testing examples
bun run packages/agents/examples/testing-examples.ts
```

## 📚 Key Concepts Demonstrated

### Agent Configuration
- **Triggers:** Event-based agent activation
- **Scopes:** Read/write permissions and access control
- **Confidence:** Auto-execution thresholds and escalation rules
- **Memory:** Temporary data storage with TTL
- **Rate Limiting:** Request throttling strategies
- **Timeouts:** Execution time limits

### Agent Handlers
- **Event Processing:** Handling different event types
- **Reasoning:** AI-powered decision making
- **Escalation:** Human handoff workflows
- **Memory Management:** Storing and retrieving context
- **Error Handling:** Graceful failure recovery

### Integrations
- **LangChain:** Advanced AI tools and agents
- **Vercel AI SDK:** Modern AI model integrations
- **Custom Functions:** Business logic integration
- **External APIs:** Third-party service connections

## 🎯 Use Case Examples

### Customer Service Agent
```typescript
// Based on basic-agent.ts
const customerServiceAgent = agents.define('customer-service')
  .trigger('message.received')
  .canRead('customers', 'orders')
  .canWrite('conversations')
  .autoExecuteAbove(0.8)
```

### Order Processing Agent
```typescript
// Based on advanced-agent.ts
const orderAgent = agents.define('order-processor')
  .trigger('order.created')
  .escalatesOn('payment-failure', 'inventory-shortage')
  .retry({ maxAttempts: 3 })
```

### Content Generation Agent
```typescript
// Based on vercel-ai-integration.ts
const contentAgent = agents.define('content-generator')
  .trigger('content.requested')
  .canInvoke('generate-text', 'store-content')
  .timeout('2m')
```

## 🧪 Testing Strategy

### Unit Testing
- Mock agent contexts
- Test individual handlers
- Verify function calls and side effects

### Integration Testing
- End-to-end workflows
- HTTP client mocking
- Performance benchmarking

### Test Scenarios
- Message handling
- Order processing
- Error conditions
- Escalation workflows

## 🚀 Best Practices

### Agent Design
1. **Single Responsibility:** Each agent should have one primary purpose
2. **Clear Triggers:** Use specific, meaningful event types
3. **Proper Scoping:** Limit permissions to what's necessary
4. **Error Handling:** Always include comprehensive error handling

### Performance
1. **Rate Limiting:** Prevent abuse and manage costs
2. **Timeouts:** Avoid hanging operations
3. **Memory Management:** Use appropriate TTL values
4. **Batching:** Process multiple items when possible

### Security
1. **Input Validation:** Validate all incoming data
2. **Permission Scoping:** Use minimum required permissions
3. **Escalation Rules:** Define clear escalation criteria
4. **Audit Logging:** Log all agent actions

## 🔗 Related Documentation

- [Agents API Reference](../src/service.ts)
- [Agent Context API](../src/context.ts)
- [Frontal Core Documentation](../../core/README.md)
- [Architecture Overview](../../../docs/ARCHITECTURE.md)

## 🤝 Contributing

When adding new examples:

1. Follow the existing code style and patterns
2. Include comprehensive comments and documentation
3. Add appropriate error handling and logging
4. Provide clear use case descriptions
5. Include setup instructions for any dependencies

## 📞 Support

For questions or issues with these examples:
- Check the [Frontal Documentation](https://docs.frontal.dev)
- Review the [API Reference](../src/)
- Open an issue on [GitHub](https://github.com/frontal-cloud/sdk-ts/issues)
