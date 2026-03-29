# Usage Guide

Step-by-step guide for using the Agents package.

## Getting Started

1. Install the package:

```bash
npm install @frontal/agents
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Create an agent instance:

```typescript
import { AgentService } from '@frontal/agents';

const agent = new AgentService({
  apiKey: process.env.FRONTAL_API_KEY!,
  provider: 'langchain',
});
```

## Basic Usage

### Simple Text Generation

```typescript
const response = await agent.execute('Hello, world!');
console.log(response.content);
```

### Streaming Responses

```typescript
for await (const chunk of agent.stream('Tell me a story')) {
  console.log(chunk.content);
}
```

## Advanced Usage

### Custom Configuration

```typescript
const agent = new AgentService({
  apiKey: process.env.FRONTAL_API_KEY!,
  provider: 'langchain',
  timeout: 30000,
  retries: 3,
});
```

### Error Handling

```typescript
try {
  const response = await agent.execute('Hello');
} catch (error) {
  console.error('Agent execution failed:', error);
}
```
