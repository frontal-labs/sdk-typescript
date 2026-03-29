# Testing Guide

This guide covers testing strategies and patterns for the Frontal Agents SDK.

## Table of Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mock Testing](#mock-testing)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)

## Unit Testing

### Testing Agent Builder

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsService, AgentBuilder } from '@frontal/agents';

describe('AgentBuilder', () => {
  let builder: AgentBuilder;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    
    builder = new AgentBuilder('test-agent', mockHttp);
  });

  describe('Builder Pattern', () => {
    it('should build agent definition correctly', () => {
      const agent = builder
        .description('Test agent')
        .trigger('test.event')
        .canRead('entity1', 'entity2')
        .canWrite('entity3')
        .autoExecuteAbove(0.9)
        .escalateBelow(0.3)
        .timeout('60s')
        .tags('test', 'experimental');

      expect(agent['_definition']).toEqual({
        name: 'test-agent',
        description: 'Test agent',
        triggers: [{ event: 'test.event' }],
        scope: {
          read: ['entity1', 'entity2'],
          write: ['entity3'],
          actions: [],
          escalate: [],
          invokeAgents: [],
          invokeFunctions: []
        },
        confidence: {
          autoExecuteAbove: 0.9,
          escalateBelow: 0.3,
          requireReviewBetween: true
        },
        timeout: '60s',
        tags: ['test', 'experimental']
      });
    });

    it('should validate confidence thresholds', () => {
      expect(() => {
        builder.autoExecuteAbove(1.5); // Invalid: > 1
      }).toThrow();

      expect(() => {
        builder.escalateBelow(-0.1); // Invalid: < 0
      }).toThrow();
    });
  });

  describe('Agent Creation', () => {
    it('should create agent successfully', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'test-agent',
        status: 'draft',
        version: 1
      };

      mockHttp.post.mockResolvedValue(mockAgent);

      const result = await builder.create();

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/agents',
        expect.any(Object),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });

    it('should handle creation errors', async () => {
      mockHttp.post.mockRejectedValue(new Error('API Error'));

      await expect(builder.create()).rejects.toThrow('API Error');
    });
  });
});
```

### Testing Agent Accessor

```typescript
describe('AgentAccessor', () => {
  let accessor: any;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      post: vi.fn()
    };
    
    accessor = new AgentAccessor('agent-123', mockHttp);
  });

  describe('Agent Operations', () => {
    it('should get agent details', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'test-agent',
        status: 'active'
      };

      mockHttp.get.mockResolvedValue(mockAgent);

      const result = await accessor.get();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/agents/agent-123',
        undefined,
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });

    it('should update agent', async () => {
      const updates = { description: 'Updated description' };
      const mockAgent = {
        id: 'agent-123',
        ...updates
      };

      mockHttp.put.mockResolvedValue(mockAgent);

      const result = await accessor.update(updates);

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/agents/agent-123',
        updates,
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });

    it('should delete agent', async () => {
      mockHttp.delete.mockResolvedValue(undefined);

      await accessor.delete();

      expect(mockHttp.delete).toHaveBeenCalledWith('/agents/agent-123');
    });
  });

  describe('Execution Management', () => {
    it('should deploy agent', async () => {
      const mockDeployment = {
        id: 'deploy-123',
        agentId: 'agent-123',
        status: 'active'
      };

      mockHttp.post.mockResolvedValue(mockDeployment);

      const result = await accessor.deploy('production');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/agents/agent-123/deploy',
        { environment: 'production' },
        expect.any(Object)
      );
      expect(result).toEqual(mockDeployment);
    });

    it('should pause agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        status: 'paused'
      };

      mockHttp.post.mockResolvedValue(mockAgent);

      const result = await accessor.pause({
        reason: 'Maintenance',
        drainInFlight: true
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/agents/agent-123/pause',
        { reason: 'Maintenance', drainInFlight: true },
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });

    it('should resume agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        status: 'active'
      };

      mockHttp.post.mockResolvedValue(mockAgent);

      const result = await accessor.resume();

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/agents/agent-123/resume',
        undefined,
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });
  });
});
```

### Testing Simulation

```typescript
describe('Agent Simulation', () => {
  let accessor: any;
  let mockHttp: any;

  beforeEach(() => {
    mockHttp = { post: vi.fn() };
    accessor = new AgentAccessor('agent-123', mockHttp);
  });

  it('should simulate event processing', async () => {
    const mockSimulation = {
      agentId: 'agent-123',
      event: 'test.event',
      outcome: 'would-execute',
      confidence: 0.92,
      decisionTrace: [
        {
          step: 1,
          type: 'observe',
          description: 'Analyzed event payload',
          durationMs: 45
        },
        {
          step: 2,
          type: 'reason',
          description: 'Determined appropriate action',
          confidence: 0.92,
          durationMs: 120
        }
      ],
      actionsWouldTake: [
        {
          action: 'update_ticket',
          parameters: { status: 'in_progress' },
          confidence: 0.92
        }
      ],
      escalationWouldTrigger: false,
      durationMs: 165
    };

    mockHttp.post.mockResolvedValue(mockSimulation);

    const result = await accessor.simulate('test.event', {
      ticketId: 'ticket-123',
      priority: 'high'
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/agents/agent-123/simulate',
      {
        event: 'test.event',
        payload: { ticketId: 'ticket-123', priority: 'high' }
      },
      expect.any(Object)
    );
    
    expect(result.outcome).toBe('would-execute');
    expect(result.confidence).toBe(0.92);
    expect(result.actionsWouldTake).toHaveLength(1);
  });
});
```

## Integration Testing

### End-to-End Agent Workflow

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { agents } from '@frontal/agents';

describe('Agent Integration Tests', () => {
  let agentId: string;

  beforeAll(async () => {
    // Create a test agent
    const agent = agents.define('integration-test-agent')
      .description('Integration test agent')
      .trigger('test.event')
      .canRead('test_entities')
      .canWrite('test_entities')
      .autoExecuteAbove(0.8)
      .escalateBelow(0.4);

    const created = await agent.create();
    agentId = created.id;
  });

  afterAll(async () => {
    // Clean up test agent
    if (agentId) {
      await agents.agent(agentId).delete();
    }
  });

  it('should handle complete agent lifecycle', async () => {
    const agent = agents.agent(agentId);

    // Deploy agent
    const deployment = await agent.deploy('staging');
    expect(deployment.status).toBe('active');

    // Send test message
    const message = await agent.message('test.event', {
      testData: 'integration test',
      timestamp: new Date().toISOString()
    });

    expect(message.status).toBeDefined();
    expect(message.executionId).toBeTruthy();

    // Check execution
    const execution = await agent.execution(message.executionId);
    expect(execution.agentId).toBe(agentId);
    expect(execution.triggerEvent).toBe('test.event');
  });

  it('should track metrics correctly', async () => {
    const agent = agents.agent(agentId);
    const metrics = await agent.metrics('24h');

    expect(metrics.executionsToday).toBeGreaterThanOrEqual(0);
    expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    expect(metrics.escalationRate).toBeGreaterThanOrEqual(0);
    expect(metrics.avgExecutionMs).toBeGreaterThanOrEqual(0);
  });
});
```

### Performance Testing

```typescript
describe('Agent Performance Tests', () => {
  it('should handle concurrent message processing', async () => {
    const agent = agents.define('perf-test-agent')
      .trigger('perf.test')
      .canRead('test_data')
      .timeout('10s');

    const created = await agent.create();
    
    try {
      const promises = Array.from({ length: 50 }, (_, i) =>
        agents.agent(created.id).message('perf.test', {
          testId: i,
          timestamp: Date.now()
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(45); // At least 90% success
      expect(duration).toBeLessThan(10000); // Under 10 seconds
    } finally {
      await agents.agent(created.id).delete();
    }
  });
});
```

## Mock Testing

### Mock Agent Service

```typescript
export class MockAgentService {
  private agents = new Map<string, any>();
  private executions = new Map<string, any>();
  private escalations = new Map<string, any>();

  createAgent(definition: any): any {
    const agent = {
      id: `agent-${Date.now()}`,
      ...definition,
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  getAgent(id: string): any {
    return this.agents.get(id);
  }

  updateAgent(id: string, updates: any): any {
    const agent = this.agents.get(id);
    if (agent) {
      const updated = {
        ...agent,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.agents.set(id, updated);
      return updated;
    }
    throw new Error('Agent not found');
  }

  deleteAgent(id: string): void {
    this.agents.delete(id);
  }

  simulateEvent(agentId: string, event: string, payload: any): any {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    // Simple simulation logic
    const confidence = Math.random();
    const outcome = confidence > 0.7 ? 'would-execute' : 
                   confidence > 0.4 ? 'would-escalate' : 'would-skip';

    return {
      agentId,
      event,
      outcome,
      confidence,
      decisionTrace: [
        {
          step: 1,
          type: 'observe',
          description: 'Analyzed event',
          durationMs: 10
        },
        {
          step: 2,
          type: 'reason',
          description: 'Made decision',
          confidence,
          durationMs: 50
        }
      ],
      actionsWouldTake: outcome === 'would-execute' ? [{
        action: 'process_event',
        parameters: payload,
        confidence
      }] : [],
      escalationWouldTrigger: outcome === 'would-escalate',
      durationMs: 60
    };
  }

  sendMessage(agentId: string, event: string, payload: any): any {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const executionId = `exec-${Date.now()}`;
    const execution = {
      id: executionId,
      agentId,
      triggerEvent: event,
      triggerPayload: payload,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 100
    };

    this.executions.set(executionId, execution);

    return {
      messageId: `msg-${Date.now()}`,
      executionId,
      status: 'completed'
    };
  }

  getExecution(agentId: string, executionId: string): any {
    return this.executions.get(executionId);
  }

  getMetrics(agentId: string, period: string): any {
    const executions = Array.from(this.executions.values())
      .filter(e => e.agentId === agentId);

    return {
      executionsToday: executions.length,
      escalationRate: 0.1,
      avgExecutionMs: 150,
      successRate: 0.95
    };
  }
}
```

### Using Mock in Tests

```typescript
describe('Agent with Mock Service', () => {
  let mockService: MockAgentService;
  let agentsService: AgentsService;

  beforeEach(() => {
    mockService = new MockAgentService();
    agentsService = new AgentsService(mockService as any);
  });

  it('should create and manage agents with mock', async () => {
    const agent = agentsService.define('mock-test-agent')
      .description('Mock test agent')
      .trigger('mock.event')
      .canRead('mock_entities');

    const created = await agent.create();
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('mock-test-agent');
    expect(created.status).toBe('draft');

    // Test retrieval
    const retrieved = await agentsService.agent(created.id).get();
    expect(retrieved.id).toBe(created.id);

    // Test simulation
    const simulation = await agentsService.agent(created.id)
      .simulate('mock.event', { testData: 'test' });
    
    expect(simulation.outcome).toBeDefined();
    expect(simulation.confidence).toBeGreaterThanOrEqual(0);
    expect(simulation.decisionTrace).toHaveLength(2);

    // Test messaging
    const message = await agentsService.agent(created.id)
      .message('mock.event', { testData: 'test' });
    
    expect(message.executionId).toBeTruthy();
    expect(message.status).toBe('completed');

    // Test metrics
    const metrics = await agentsService.agent(created.id).metrics('24h');
    expect(metrics.executionsToday).toBeGreaterThanOrEqual(0);
  });
});
```

## Test Utilities

### Agent Test Helpers

```typescript
export class AgentTestUtils {
  static createTestAgent(name: string, overrides: any = {}): any {
    return {
      id: `test-${name}-${Date.now()}`,
      name,
      description: `Test agent for ${name}`,
      status: 'active',
      version: 1,
      triggers: [{ event: 'test.event' }],
      scope: {
        read: ['test_entities'],
        write: ['test_entities'],
        actions: [],
        escalate: [],
        invokeAgents: [],
        invokeFunctions: []
      },
      confidence: {
        autoExecuteAbove: 0.8,
        escalateBelow: 0.4,
        requireReviewBetween: true
      },
      memory: {
        type: 'working',
        ttl: '1h'
      },
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2
      },
      timeout: '30s',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createTestExecution(agentId: string, overrides: any = {}): any {
    return {
      id: `exec-${Date.now()}`,
      agentId,
      triggerEvent: 'test.event',
      triggerPayload: { testData: 'test' },
      status: 'completed',
      outcome: 'success',
      confidence: 0.85,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 150,
      ...overrides
    };
  }

  static createTestEscalation(agentId: string, overrides: any = {}): any {
    return {
      id: `esc-${Date.now()}`,
      agentId,
      executionId: `exec-${Date.now()}`,
      status: 'pending',
      urgency: 'medium',
      situation: 'Test escalation situation',
      recommendation: 'Test recommendation',
      evidence: { reason: 'Test evidence' },
      alternatives: [],
      availableActions: [],
      confidence: 0.3,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  static async waitForAgentStatus(
    agentId: string,
    targetStatus: string,
    timeout: number = 30000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const agent = await agents.agent(agentId).get();
      if (agent.status === targetStatus) {
        return agent;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Agent did not reach status ${targetStatus} within ${timeout}ms`);
  }

  static async waitForExecutionCompletion(
    agentId: string,
    executionId: string,
    timeout: number = 60000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const execution = await agents.agent(agentId).execution(executionId);
      if (['completed', 'failed', 'escalated'].includes(execution.status)) {
        return execution;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Execution did not complete within ${timeout}ms`);
  }
}
```

### Assertion Helpers

```typescript
export class AgentAssertions {
  static assertValidAgent(agent: any) {
    expect(agent).toBeDefined();
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBeTruthy();
    expect(agent.status).toMatch(/^(draft|active|paused|deprecated)$/);
    expect(agent.version).toBeGreaterThanOrEqual(1);
    expect(agent.triggers).toBeInstanceOf(Array);
    expect(agent.scope).toBeDefined();
    expect(agent.confidence).toBeDefined();
  }

  static assertValidExecution(execution: any) {
    expect(execution).toBeDefined();
    expect(execution.id).toBeTruthy();
    expect(execution.agentId).toBeTruthy();
    expect(execution.triggerEvent).toBeTruthy();
    expect(execution.status).toMatch(/^(running|completed|failed|escalated)$/);
    expect(execution.startedAt).toBeTruthy();
  }

  static assertValidEscalation(escalation: any) {
    expect(escalation).toBeDefined();
    expect(escalation.id).toBeTruthy();
    expect(escalation.agentId).toBeTruthy();
    expect(escalation.status).toMatch(/^(pending|resolved|delegated|overridden|expired)$/);
    expect(escalation.urgency).toMatch(/^(critical|high|medium|low)$/);
    expect(escalation.situation).toBeTruthy();
    expect(escalation.confidence).toBeGreaterThanOrEqual(0);
    expect(escalation.confidence).toBeLessThanOrEqual(1);
  }

  static assertValidSimulation(simulation: any) {
    expect(simulation).toBeDefined();
    expect(simulation.agentId).toBeTruthy();
    expect(simulation.event).toBeTruthy();
    expect(simulation.outcome).toMatch(/^(would-execute|would-escalate|would-skip|would-fail)$/);
    expect(simulation.confidence).toBeGreaterThanOrEqual(0);
    expect(simulation.confidence).toBeLessThanOrEqual(1);
    expect(simulation.decisionTrace).toBeInstanceOf(Array);
    expect(simulation.actionsWouldTake).toBeInstanceOf(Array);
  }
}
```

## Best Practices

### 1. Test Structure

```typescript
describe('Agent Feature', () => {
  let agentId: string;
  let mockService: MockAgentService;

  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  beforeEach(() => {
    // Setup for each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('Specific Functionality', () => {
    it('should handle happy path', async () => {
      // Test implementation
    });

    it('should handle error cases', async () => {
      // Test implementation
    });
  });
});
```

### 2. Mock Strategy

- **Unit Tests**: Use mock services for all external dependencies
- **Integration Tests**: Use real API with test environment
- **Performance Tests**: Focus on concurrency and response times

### 3. Test Data Management

```typescript
// tests/fixtures/agent-data.ts
export const TEST_AGENTS = {
  simple: {
    name: 'simple-test-agent',
    description: 'Simple test agent',
    triggers: [{ event: 'test.simple' }],
    scope: { read: ['test'], write: [] }
  },
  
  complex: {
    name: 'complex-test-agent',
    description: 'Complex test agent with multiple triggers',
    triggers: [
      { event: 'test.event1' },
      { event: 'test.event2', filter: { priority: 'high' } }
    ],
    scope: {
      read: ['entities', 'users'],
      write: ['responses'],
      actions: ['send_email', 'create_ticket']
    }
  }
};

export const TEST_EVENTS = {
  simple: {
    event: 'test.simple',
    payload: { message: 'test message' }
  },
  
  complex: {
    event: 'test.event1',
    payload: {
      userId: 'user-123',
      entityId: 'entity-456',
      metadata: { source: 'test' }
    }
  }
};
```

### 4. Error Testing

```typescript
describe('Error Handling', () => {
  it('should handle invalid agent definitions', async () => {
    const builder = agents.define('invalid-agent')
      .trigger('test.event')
      .autoExecuteAbove(1.5); // Invalid

    await expect(builder.create()).rejects.toThrow();
  });

  it('should handle missing agents', async () => {
    await expect(agents.agent('non-existent').get())
      .rejects.toThrow();
  });

  it('should handle invalid executions', async () => {
    await expect(agents.agent('agent-123')
      .execution('non-existent'))
      .rejects.toThrow();
  });
});
```

### 5. Coverage Goals

- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: Critical path coverage
- **Error Cases**: All error branches tested
- **Edge Cases**: Boundary conditions tested

### 6. Environment Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    setupFiles: ['./tests/setup.ts']
  }
});

// tests/setup.ts
import { vi } from 'vitest';

// Global mocks
vi.mock('@frontal/core', () => ({
  FrontalClient: vi.fn(),
  getDefaultClient: vi.fn()
}));

// Test utilities
global.AgentTestUtils = AgentTestUtils;
global.AgentAssertions = AgentAssertions;
```

This testing guide provides comprehensive strategies for ensuring the reliability and performance of the Frontal Agents SDK.
