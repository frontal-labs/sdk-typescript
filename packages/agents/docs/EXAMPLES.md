# Examples

This page contains practical examples and tutorials for using the Frontal Agents SDK.

## Table of Contents

- [Basic Agent Creation](#basic-agent-creation)
- [Event-Driven Agents](#event-driven-agents)
- [Multi-Trigger Agents](#multi-trigger-agents)
- [Agent Lifecycle Management](#agent-lifecycle-management)
- [Simulation and Testing](#simulation-and-testing)
- [Escalation Handling](#escalation-handling)
- [Experiments and A/B Testing](#experiments-and-ab-testing)
- [Advanced Patterns](#advanced-patterns)

## Basic Agent Creation

### Simple Customer Support Agent

```typescript
import { agents } from '@frontal/agents';

const supportAgent = agents.define('customer-support')
  .description('Handles basic customer support inquiries')
  .trigger('support.ticket.created')
  .canRead('tickets', 'customers', 'products')
  .canWrite('tickets', 'responses')
  .autoExecuteAbove(0.85)
  .escalateBelow(0.60)
  .timeout('30s')
  .tags('support', 'automation');

// Deploy the agent
const deployedAgent = await supportAgent.deploy();
console.log(`Agent deployed with ID: ${deployedAgent.id}`);
```

### Data Processing Agent

```typescript
const dataProcessor = agents.define('data-processor')
  .description('Processes incoming data files')
  .trigger('data.file.uploaded')
  .canRead('files', 'datasets')
  .canWrite('processed_data', 'reports')
  .memory({
    type: 'persistent',
    ttl: '24h',
    maxTokens: 4000
  })
  .retry({
    maxAttempts: 3,
    backoffMultiplier: 2
  })
  .rateLimit({
    maxExecutionsPerMinute: 10,
    maxConcurrent: 3
  });

await dataProcessor.deploy('staging');
```

## Event-Driven Agents

### Trigger with Event Filtering

```typescript
const priorityHandler = agents.define('priority-handler')
  .description('Handles high-priority events')
  .trigger('system.alert', {
    priority: 'critical',
    severity: { $gte: 8 }
  })
  .trigger('user.report', {
    urgency: 'high',
    requiresImmediate: true
  })
  .canRead('alerts', 'reports', 'users')
  .canWrite('escalations', 'notifications')
  .escalateBelow(0.70)
  .timeout('60s');

// Send events that match triggers
await agents.agent('priority-handler').message('system.alert', {
  priority: 'critical',
  severity: 9,
  message: 'Database connection failed',
  timestamp: new Date().toISOString()
});
```

### Debounced Triggers

```typescript
const batchProcessor = agents.define('batch-processor')
  .description('Processes events in batches with debouncing')
  .trigger('data.update', {
    source: 'api'
  }, '5s') // Debounce for 5 seconds
  .canRead('data_records', 'updates')
  .canWrite('batch_results')
  .autoExecuteAbove(0.90)
  .timeout('120s');

// Multiple rapid events will be debounced
for (let i = 0; i < 10; i++) {
  await agents.agent('batch-processor').message('data.update', {
    source: 'api',
    recordId: `record-${i}`,
    data: { value: Math.random() }
  });
}
// Only one execution will occur after 5 seconds of silence
```

## Multi-Trigger Agents

### Complex Agent with Multiple Triggers

```typescript
const omnichannelAgent = agents.define('omnichannel-support')
  .description('Handles support across multiple channels')
  .trigger('email.received')
  .trigger('chat.message')
  .trigger('social.mention')
  .trigger('phone.call.ended')
  .canRead('emails', 'chats', 'social_posts', 'call_logs')
  .canWrite('tickets', 'responses', 'escalations')
  .confidence({
    autoExecuteAbove: 0.80,
    escalateBelow: 0.50,
    requireReviewBetween: true
  })
  .tags('support', 'omnichannel');

await omnichannelAgent.deploy();
```

### Conditional Trigger Handling

```typescript
const smartRouter = agents.define('smart-router')
  .description('Routes requests based on content and context')
  .trigger('support.request', {
    channel: 'email'
  })
  .trigger('support.request', {
    channel: 'chat',
    priority: 'high'
  })
  .trigger('support.request', {
    channel: 'phone',
    afterHours: true
  })
  .canRead('requests', 'agents', 'schedules')
  .canWrite('assignments', 'escalations')
  .autoExecuteAbove(0.75);

// The agent will trigger for different conditions
await agents.agent('smart-router').message('support.request', {
  channel: 'email',
  requestId: 'req-123',
  content: 'Help with my order'
});
```

## Agent Lifecycle Management

### Complete Agent Lifecycle

```typescript
class AgentManager {
  async createAndDeployAgent() {
    // Create agent
    const agent = agents.define('lifecycle-demo')
      .description('Demonstrates agent lifecycle')
      .trigger('demo.event')
      .canRead('demo_data')
      .canWrite('demo_results');

    // Create in draft state
    const created = await agent.create();
    console.log('Agent created:', created.id);

    // Deploy to staging
    const stagingDeploy = await agents.agent(created.id).deploy('staging');
    console.log('Staging deployment:', stagingDeploy.status);

    // Run simulation
    const simulation = await agents.agent(created.id).simulate('demo.event', {
      testData: 'lifecycle test'
    });
    console.log('Simulation outcome:', simulation.outcome);

    // Deploy to production if simulation passes
    if (simulation.outcome === 'would-execute' && simulation.confidence > 0.8) {
      const prodDeploy = await agents.agent(created.id).deploy('production');
      console.log('Production deployment:', prodDeploy.status);
      
      return created.id;
    } else {
      console.log('Simulation failed, not deploying to production');
      await agents.agent(created.id).delete();
      throw new Error('Agent did not pass simulation');
    }
  }

  async manageAgentExecution(agentId: string) {
    const agent = agents.agent(agentId);

    // Send message
    const message = await agent.message('demo.event', {
      testData: 'execution test',
      timestamp: Date.now()
    });

    // Monitor execution
    const execution = await agent.execution(message.executionId);
    console.log('Execution status:', execution.status);

    // Wait for completion
    const completed = await this.waitForExecution(agent, message.executionId);
    console.log('Final execution:', completed);

    return completed;
  }

  async pauseAndResume(agentId: string) {
    const agent = agents.agent(agentId);

    // Pause with reason
    await agent.pause({
      reason: 'Scheduled maintenance',
      drainInFlight: true
    });
    console.log('Agent paused');

    // Wait for maintenance
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Resume
    const resumed = await agent.resume();
    console.log('Agent resumed:', resumed.status);
  }

  private async waitForExecution(agent: any, executionId: string) {
    let execution = await agent.execution(executionId);
    
    while (!['completed', 'failed', 'escalated'].includes(execution.status)) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      execution = await agent.execution(executionId);
    }
    
    return execution;
  }
}

// Usage
const manager = new AgentManager();
const agentId = await manager.createAndDeployAgent();
await manager.manageAgentExecution(agentId);
await manager.pauseAndResume(agentId);
```

### Version Management and Rollback

```typescript
class VersionManager {
  async deployWithRollback(agentId: string) {
    const agent = agents.agent(agentId);
    
    // Get current version
    const current = await agent.get();
    const currentVersion = current.version;
    
    try {
      // Deploy new version
      const deployment = await agent.deploy('production', {
        runSimulationFirst: true
      });
      
      console.log(`Deployed version ${deployment.version}`);
      
      // Monitor for issues
      await this.monitorDeployment(agentId, deployment.version);
      
    } catch (error) {
      console.error('Deployment failed, rolling back:', error);
      
      // Rollback to previous version
      const rollback = await agent.rollback({
        toVersion: currentVersion
      });
      
      console.log(`Rolled back to version ${rollback.version}`);
      throw error;
    }
  }

  private async monitorDeployment(agentId: string, version: number) {
    const agent = agents.agent(agentId);
    const monitoringPeriod = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < monitoringPeriod) {
      const metrics = await agent.metrics('1h');
      
      // Check for issues
      if (metrics.successRate < 0.9 || metrics.escalationRate > 0.2) {
        throw new Error(`Deployment issues detected: success=${metrics.successRate}, escalations=${metrics.escalationRate}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
    }
  }
}
```

## Simulation and Testing

### Pre-Deployment Simulation

```typescript
class SimulationTester {
  async comprehensiveSimulation(agentId: string) {
    const agent = agents.agent(agentId);
    
    const testCases = [
      {
        event: 'support.ticket.created',
        payload: { priority: 'low', category: 'general' },
        expectedOutcome: 'would-execute'
      },
      {
        event: 'support.ticket.created',
        payload: { priority: 'critical', category: 'security' },
        expectedOutcome: 'would-execute'
      },
      {
        event: 'support.ticket.created',
        payload: { priority: 'medium', category: 'complex' },
        expectedOutcome: 'would-escalate'
      }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      const simulation = await agent.simulate(testCase.event, testCase.payload);
      
      results.push({
        testCase,
        actual: simulation.outcome,
        expected: testCase.expectedOutcome,
        confidence: simulation.confidence,
        passed: simulation.outcome === testCase.expectedOutcome
      });
      
      console.log(`Test ${testCase.event}: ${simulation.outcome} (confidence: ${simulation.confidence})`);
    }

    const passRate = results.filter(r => r.passed).length / results.length;
    console.log(`Overall pass rate: ${passRate * 100}%`);

    if (passRate < 0.8) {
      throw new Error(`Simulation pass rate too low: ${passRate * 100}%`);
    }

    return results;
  }

  async stressTestAgent(agentId: string, concurrency = 50) {
    const agent = agents.agent(agentId);
    
    const promises = Array.from({ length: concurrency }, (_, i) =>
      agent.simulate('stress.test.event', {
        testId: i,
        timestamp: Date.now(),
        data: `stress test data ${i}`
      })
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled');
    const averageConfidence = successful.reduce((sum, r) => {
      return sum + (r.status === 'fulfilled' ? r.value.confidence : 0);
    }, 0) / successful.length;

    console.log(`Stress test results:`);
    console.log(`- Success rate: ${(successful.length / concurrency) * 100}%`);
    console.log(`- Average confidence: ${averageConfidence}`);
    console.log(`- Total duration: ${duration}ms`);
    console.log(`- Average per simulation: ${duration / concurrency}ms`);

    return {
      successRate: successful.length / concurrency,
      averageConfidence,
      totalDuration: duration,
      averageDuration: duration / concurrency
    };
  }
}
```

### Edge Case Testing

```typescript
class EdgeCaseTester {
  async testEdgeCases(agentId: string) {
    const agent = agents.agent(agentId);
    
    const edgeCases = [
      // Empty payload
      {
        name: 'Empty payload',
        event: 'test.event',
        payload: {}
      },
      
      // Very large payload
      {
        name: 'Large payload',
        event: 'test.event',
        payload: {
          data: 'x'.repeat(10000),
          nested: { deep: { value: 'large object' } }
        }
      },
      
      // Special characters
      {
        name: 'Special characters',
        event: 'test.event',
        payload: {
          text: 'Special chars: [ROCKET] ñáéíóú 中文',
          unicode: 'Unicode test: 𝔘𝔫𝔦𝔠𝔬𝔡𝔢'
        }
      },
      
      // Null values
      {
        name: 'Null values',
        event: 'test.event',
        payload: {
          value: null,
          array: [1, null, 3],
          object: { key: null }
        }
      }
    ];

    const results = [];
    
    for (const edgeCase of edgeCases) {
      try {
        const simulation = await agent.simulate(edgeCase.event, edgeCase.payload);
        
        results.push({
          name: edgeCase.name,
          status: 'success',
          outcome: simulation.outcome,
          confidence: simulation.confidence,
          error: null
        });
      } catch (error) {
        results.push({
          name: edgeCase.name,
          status: 'error',
          outcome: null,
          confidence: null,
          error: error.message
        });
      }
    }

    return results;
  }
}
```

## Escalation Handling

### Escalation Management

```typescript
class EscalationManager {
  async handleEscalations(agentId: string) {
    const agent = agents.agent(agentId);
    
    // Get pending escalations
    const escalations = await agent.escalations({ status: 'pending' });
    
    for (const escalation of escalations.data) {
      console.log(`Processing escalation ${escalation.id}: ${escalation.situation}`);
      
      // Analyze escalation
      const action = await this.determineEscalationAction(escalation);
      
      // Resolve escalation
      await agents.escalations.resolve(escalation.id, {
        decision: action.decision,
        reasoning: action.reasoning,
        learnFrom: true
      });
      
      console.log(`Resolved escalation ${escalation.id} with action: ${action.decision}`);
    }
  }

  private async determineEscalationAction(escalation: any) {
    // Simple escalation logic
    if (escalation.urgency === 'critical') {
      return {
        decision: 'immediate_human_intervention',
        reasoning: 'Critical urgency requires immediate human attention'
      };
    }
    
    if (escalation.confidence < 0.3) {
      return {
        decision: 'gather_more_information',
        reasoning: 'Low confidence suggests need for more data'
      };
    }
    
    return {
      decision: 'proceed_with_caution',
      reasoning: 'Moderate confidence allows cautious progression'
    };
  }

  async delegateEscalation(escalationId: string, delegateTo: string) {
    const result = await agents.escalations.delegate(escalationId, {
      delegateTo,
      note: 'Delegated to specialist team'
    });
    
    console.log(`Escalation ${escalationId} delegated to ${delegateTo}`);
    return result;
  }

  async overrideEscalation(escalationId: string, action: string) {
    const result = await agents.escalations.override(escalationId, {
      action,
      reasoning: 'Manual override by supervisor',
      parameters: { manualOverride: true }
    });
    
    console.log(`Escalation ${escalationId} overridden with action: ${action}`);
    return result;
  }
}
```

### Escalation Monitoring

```typescript
class EscalationMonitor {
  async monitorEscalations(agentId: string, period = '24h') {
    const agent = agents.agent(agentId);
    const escalations = await agent.escalations();
    
    const stats = {
      total: escalations.data.length,
      byUrgency: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      averageResolutionTime: 0,
      escalationRate: 0
    };

    // Calculate statistics
    escalations.data.forEach(escalation => {
      stats.byUrgency[escalation.urgency] = (stats.byUrgency[escalation.urgency] || 0) + 1;
      stats.byStatus[escalation.status] = (stats.byStatus[escalation.status] || 0) + 1;
    });

    // Calculate average resolution time
    const resolved = escalations.data.filter(e => e.status === 'resolved' && e.resolvedAt);
    if (resolved.length > 0) {
      const totalTime = resolved.reduce((sum, e) => {
        const resolved = new Date(e.resolvedAt);
        const created = new Date(e.createdAt);
        return sum + (resolved.getTime() - created.getTime());
      }, 0);
      stats.averageResolutionTime = totalTime / resolved.length;
    }

    // Get agent metrics for escalation rate
    const metrics = await agent.metrics(period);
    stats.escalationRate = metrics.escalationRate;

    console.log('Escalation Statistics:');
    console.log(`- Total escalations: ${stats.total}`);
    console.log(`- Escalation rate: ${(stats.escalationRate * 100).toFixed(2)}%`);
    console.log(`- Average resolution time: ${(stats.averageResolutionTime / 60000).toFixed(2)} minutes`);
    console.log(`- By urgency:`, stats.byUrgency);
    console.log(`- By status:`, stats.byStatus);

    return stats;
  }
}
```

## Experiments and A/B Testing

### Setting Up Experiments

```typescript
class ExperimentManager {
  async createExperiment(agentId: string) {
    const agent = agents.agent(agentId);
    
    const experiment = await agent.experiments.create({
      name: 'response-time-optimization',
      variants: [
        {
          name: 'control',
          weight: 0.5,
          behaviorOverrides: {
            timeout: '30s',
            autoExecuteAbove: 0.85
          }
        },
        {
          name: 'fast-response',
          weight: 0.5,
          behaviorOverrides: {
            timeout: '15s',
            autoExecuteAbove: 0.80
          }
        }
      ],
      metric: 'avgExecutionMs',
      metricDirection: 'lower-is-better',
      duration: '7d',
      minSampleSize: 100
    });

    console.log(`Created experiment ${experiment.id} with ${experiment.variants.length} variants`);
    return experiment;
  }

  async monitorExperiment(agentId: string, experimentId: string) {
    const agent = agents.agent(agentId);
    const experiment = await agent.experiments.get(experimentId);
    
    console.log(`Monitoring experiment: ${experiment.name}`);
    console.log(`Status: ${experiment.status}`);
    console.log(`Duration: ${experiment.duration}`);
    console.log(`Metric: ${experiment.metric} (${experiment.metricDirection})`);
    
    experiment.variants.forEach(variant => {
      console.log(`- ${variant.name}: weight=${variant.weight}`);
    });

    // In a real implementation, you would monitor the experiment progress
    // and potentially conclude it early if there's a clear winner
    
    return experiment;
  }

  async concludeExperiment(agentId: string, experimentId: string) {
    const agent = agents.agent(agentId);
    
    // This would typically be based on statistical analysis
    const winnerVariant = 'fast-response';
    
    const concluded = await agent.experiments.conclude(experimentId, {
      winnerVariant,
      promoteToProduction: true
    });

    console.log(`Experiment concluded. Winner: ${winnerVariant}`);
    console.log(`Promoted to production: ${concluded.promoteToProduction}`);

    return concluded;
  }
}
```

### Multi-Variant Testing

```typescript
class MultiVariantTester {
  async createComplexExperiment(agentId: string) {
    const agent = agents.agent(agentId);
    
    const experiment = await agent.experiments.create({
      name: 'comprehensive-behavior-test',
      variants: [
        {
          name: 'conservative',
          weight: 0.25,
          behaviorOverrides: {
            autoExecuteAbove: 0.90,
            escalateBelow: 0.40,
            timeout: '60s',
            retry: { maxAttempts: 5 }
          }
        },
        {
          name: 'balanced',
          weight: 0.25,
          behaviorOverrides: {
            autoExecuteAbove: 0.80,
            escalateBelow: 0.50,
            timeout: '30s',
            retry: { maxAttempts: 3 }
          }
        },
        {
          name: 'aggressive',
          weight: 0.25,
          behaviorOverrides: {
            autoExecuteAbove: 0.70,
            escalateBelow: 0.60,
            timeout: '15s',
            retry: { maxAttempts: 2 }
          }
        },
        {
          name: 'experimental',
          weight: 0.25,
          behaviorOverrides: {
            autoExecuteAbove: 0.75,
            escalateBelow: 0.45,
            timeout: '20s',
            retry: { maxAttempts: 4 },
            memory: { type: 'persistent', ttl: '2h' }
          }
        }
      ],
      metric: 'successRate',
      metricDirection: 'higher-is-better',
      duration: '14d',
      minSampleSize: 200
    });

    return experiment;
  }
}
```

## Advanced Patterns

### Agent Composition

```typescript
class AgentComposer {
  createCompositeAgent(name: string, subAgents: string[]) {
    const composite = agents.define(name)
      .description(`Composite agent coordinating ${subAgents.join(', ')}`)
      .trigger('composite.request')
      .canRead('requests', 'responses')
      .canWrite('coordinations', 'aggregations')
      .canInvoke(...subAgents)
      .autoExecuteAbove(0.75)
      .timeout('120s');

    return composite;
  }

  async coordinateAgents(compositeId: string, subAgents: string[]) {
    const composite = agents.agent(compositeId);
    
    // Send coordination request
    const result = await composite.message('composite.request', {
      task: 'coordinate_sub_agents',
      subAgents,
      parameters: {
        parallel: true,
        timeout: '60s',
        aggregation: 'merge_results'
      }
    });

    return result;
  }
}
```

### Dynamic Agent Configuration

```typescript
class DynamicAgentManager {
  async updateAgentBehavior(agentId: string, newConfig: any) {
    const agent = agents.agent(agentId);
    
    // Get current configuration
    const current = await agent.get();
    
    // Update with new configuration
    const updated = await agent.update({
      confidence: {
        ...current.confidence,
        ...newConfig.confidence
      },
      timeout: newConfig.timeout || current.timeout,
      rateLimit: {
        ...current.rateLimit,
        ...newConfig.rateLimit
      }
    });

    console.log(`Agent ${agentId} updated with new configuration`);
    
    // Deploy updated version
    const deployment = await agent.deploy('production', {
      runSimulationFirst: true
    });

    return { updated, deployment };
  }

  async adaptiveThresholds(agentId: string) {
    const agent = agents.agent(agentId);
    const metrics = await agent.metrics('24h');
    
    let newThresholds = {};
    
    // Adjust thresholds based on performance
    if (metrics.successRate < 0.8) {
      newThresholds = {
        confidence: {
          autoExecuteAbove: Math.max(0.7, metrics.successRate - 0.1),
          escalateBelow: Math.min(0.5, metrics.escalationRate + 0.1)
        }
      };
    } else if (metrics.successRate > 0.95) {
      newThresholds = {
        confidence: {
          autoExecuteAbove: Math.min(0.9, metrics.successRate + 0.05),
          escalateBelow: Math.max(0.3, metrics.escalationRate - 0.05)
        }
      };
    }

    if (Object.keys(newThresholds).length > 0) {
      return await this.updateAgentBehavior(agentId, newThresholds);
    }

    return null;
  }
}
```

### Agent Monitoring and Alerting

```typescript
class AgentMonitor {
  async setupMonitoring(agentId: string) {
    const agent = agents.agent(agentId);
    
    // Set up periodic monitoring
    const monitor = setInterval(async () => {
      const metrics = await agent.metrics('1h');
      const escalations = await agent.escalations({ status: 'pending' });
      
      // Check for issues
      const issues = [];
      
      if (metrics.successRate < 0.8) {
        issues.push(`Low success rate: ${(metrics.successRate * 100).toFixed(2)}%`);
      }
      
      if (metrics.escalationRate > 0.3) {
        issues.push(`High escalation rate: ${(metrics.escalationRate * 100).toFixed(2)}%`);
      }
      
      if (metrics.avgExecutionMs > 30000) {
        issues.push(`Slow execution: ${metrics.avgExecutionMs}ms average`);
      }
      
      if (escalations.data.length > 5) {
        issues.push(`High pending escalations: ${escalations.data.length}`);
      }
      
      if (issues.length > 0) {
        console.warn(`Agent ${agentId} issues detected:`, issues);
        await this.sendAlert(agentId, issues);
      }
    }, 60000); // Check every minute

    return monitor;
  }

  private async sendAlert(agentId: string, issues: string[]) {
    // In a real implementation, this would send alerts to monitoring systems
    console.log(`ALERT for agent ${agentId}:`, issues);
    
    // Could also create an escalation for human review
    const escalationAgent = agents.agent('alert-handler');
    if (escalationAgent) {
      await escalationAgent.message('agent.performance.alert', {
        agentId,
        issues,
        timestamp: new Date().toISOString(),
        severity: issues.length > 3 ? 'high' : 'medium'
      });
    }
  }

  async generateHealthReport(agentId: string) {
    const agent = agents.agent(agentId);
    
    const [metrics, escalations, executions] = await Promise.all([
      agent.metrics('24h'),
      agent.escalations(),
      agent.executions({ limit: 100 })
    ]);

    const report = {
      agentId,
      timestamp: new Date().toISOString(),
      performance: {
        successRate: metrics.successRate,
        escalationRate: metrics.escalationRate,
        avgExecutionMs: metrics.avgExecutionMs,
        executionsToday: metrics.executionsToday
      },
      escalations: {
        pending: escalations.data.filter(e => e.status === 'pending').length,
        total: escalations.data.length,
        byUrgency: this.groupByUrgency(escalations.data)
      },
      executions: {
        total: executions.data.length,
        byStatus: this.groupByStatus(executions.data),
        recentTrend: this.calculateTrend(executions.data)
      },
      health: this.calculateHealthScore(metrics, escalations.data)
    };

    return report;
  }

  private groupByUrgency(escalations: any[]) {
    return escalations.reduce((acc, e) => {
      acc[e.urgency] = (acc[e.urgency] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByStatus(executions: any[]) {
    return executions.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateTrend(executions: any[]) {
    // Simple trend calculation based on recent executions
    const recent = executions.slice(-10);
    const successCount = recent.filter(e => e.status === 'completed').length;
    return successCount / recent.length;
  }

  private calculateHealthScore(metrics: any, escalations: any[]) {
    let score = 100;
    
    // Penalize low success rate
    score -= (1 - metrics.successRate) * 40;
    
    // Penalize high escalation rate
    score -= metrics.escalationRate * 30;
    
    // Penalize slow execution
    if (metrics.avgExecutionMs > 30000) {
      score -= 20;
    }
    
    // Penalize many pending escalations
    const pendingEscalations = escalations.filter(e => e.status === 'pending').length;
    if (pendingEscalations > 5) {
      score -= 10;
    }
    
    return Math.max(0, Math.round(score));
  }
}
```

These examples demonstrate practical implementations of common agent workflows using the Frontal Agents SDK.
