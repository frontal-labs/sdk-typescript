# Frontal Agents SDK

A powerful framework for building, deploying, and managing intelligent autonomous agents on Frontal.

## Features

- **Agent Builder**: Fluent API for defining agent behavior
- **Trigger System**: Event-driven architecture with flexible filtering
- **Decision Making**: Confidence-based execution with human oversight
- **Memory Management**: Working, persistent, and episodic memory types
- **Escalation Handling**: Automatic escalation when confidence is low
- **Experiments**: A/B testing for agent behavior
- **Monitoring**: Comprehensive metrics and execution tracking
- **Simulation**: Test agent behavior before deployment

## Installation

```bash
bun add @frontal/agents
```

## Quick Start

```typescript
import { agents } from '@frontal/agents';

// Define an agent
const agent = agents.define('customer-support')
  .description('Handles customer support inquiries')
  .trigger('support.ticket.created')
  .canRead('tickets', 'customers', 'products')
  .canWrite('tickets', 'responses')
  .autoExecuteAbove(0.85)
  .escalateBelow(0.60)
  .timeout('30s')
  .tags('support', 'automation');

// Deploy the agent
const deployedAgent = await agent.deploy();

// Send a message to the agent
const result = await deployedAgent.message('support.ticket.created', {
  ticketId: 'ticket-123',
  customerId: 'customer-456',
  issue: 'Product not working'
});
```

## Configuration

Configure the SDK using environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev/v1
```

Or create a custom client:

```typescript
import { createAgentsClient, AgentsService } from '@frontal/agents';
import { FrontalClient } from '@frontal/core';

const client = new FrontalClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.frontal.dev/v1'
});

const agents = createAgentsClient(client);
```

## Documentation

- [Overview](./OVERVIEW.md) - Complete package overview
- [API Reference](./API-REFERENCE.md) - Detailed API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture
- [Developer Guide](./GUIDE.md) - Advanced usage patterns
- [Examples](./EXAMPLES.md) - Code examples and tutorials
- [Testing](./TESTING.md) - Testing guide
