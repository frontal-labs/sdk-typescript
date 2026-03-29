# API Reference

Complete API reference for the Agents package.

## Classes

### AgentService

Main service class for interacting with agent providers.

```typescript
class AgentService {
  constructor(config: AgentConfig)
  
  async execute(prompt: string): Promise<AgentResponse>
  async stream(prompt: string): Promise<AsyncIterable<AgentResponse>>
  configure(config: Partial<AgentConfig>): void
}
```

## Interfaces

### AgentConfig

Configuration interface for agent services.

```typescript
interface AgentConfig {
  apiKey: string
  provider: 'langchain' | 'langgraph' | 'vercel-ai' | 'mastra'
  baseUrl?: string
  timeout?: number
  retries?: number
}
```

### AgentResponse

Response interface from agent executions.

```typescript
interface AgentResponse {
  content: string
  metadata?: Record<string, any>
  timestamp: Date
}
```
