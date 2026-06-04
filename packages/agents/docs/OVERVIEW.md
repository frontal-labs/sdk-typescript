# Agents Package

The Frontal Agents package provides integrations with various AI and agent frameworks, enabling seamless interaction with different agent systems.

## Overview

This package includes:
- LangChain integration
- LangGraph integration
- Vercel AI integration
- Mastra integration
- Custom agent utilities

## Installation

```bash
npm install @frontal-labs/agents
```

## Quick Start

```typescript
import { AgentService } from '@frontal-labs/agents';

const agent = new AgentService({
  apiKey: 'your-api-key',
  provider: 'langchain',
});
```

## Features

- **Multi-provider support**: LangChain, LangGraph, Vercel AI, Mastra
- **Type-safe interfaces**: Full TypeScript support
- **Error handling**: Comprehensive error management
- **Retry logic**: Built-in retry mechanisms
- **Logging**: Detailed logging capabilities

## Documentation

- [API Reference](./API-REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Usage Guide](./GUIDE.md)

## License

MIT
