/**
 * Testing Examples for Agents
 *
 * This file contains test examples and utilities for testing agent functionality,
 * including unit tests, integration tests, and simulation scenarios.
 */

import {
	type AgentContext,
	type AgentHandler,
	AgentsService,
} from "@frontal/agents";
import type { HttpClient } from "@frontal/core";

// Mock HTTP client for testing
class MockHttpClient implements Partial<HttpClient> {
	private responses: Map<string, any> = new Map();
	private calls: Array<{ method: string; url: string; data?: any }> = [];

	setMockResponse(url: string, response: any) {
		this.responses.set(url, response);
	}

	async get(url: string, params?: any, _schema?: any): Promise<any> {
		this.calls.push({ method: "GET", url, data: params });
		return this.responses.get(url) || { data: [] };
	}

	async post(url: string, data?: any, _schema?: any): Promise<any> {
		this.calls.push({ method: "POST", url, data });
		return this.responses.get(url) || { id: "mock-id", ...data };
	}

	async put(url: string, data?: any, _schema?: any): Promise<any> {
		this.calls.push({ method: "PUT", url, data });
		return this.responses.get(url) || { id: "mock-id", ...data };
	}

	async delete(url: string): Promise<void> {
		this.calls.push({ method: "DELETE", url });
	}

	getCalls() {
		return this.calls;
	}

	reset() {
		this.calls = [];
		this.responses.clear();
	}
}

// Mock agent context for testing
function createMockContext(
	overrides: Partial<AgentContext> = {},
): AgentContext {
	return {
		event: {
			type: "test.event",
			payload: { test: "data" },
			entityId: "test-entity",
			entityType: "test-type",
			timestamp: new Date(),
		},
		graph: {
			get: jest.fn().mockResolvedValue({ id: "test", data: "test" }),
			find: jest.fn().mockReturnValue({
				limit: jest.fn().mockReturnValue({
					execute: jest.fn().mockResolvedValue({ data: [] }),
					first: jest.fn().mockResolvedValue(null),
				}),
			}),
			update: jest.fn().mockResolvedValue({ id: "test", updated: true }),
			create: jest.fn().mockResolvedValue({ id: "test", created: true }),
		},
		actions: {},
		agents: {
			invoke: jest.fn().mockResolvedValue(undefined),
		},
		functions: {
			invoke: jest.fn().mockResolvedValue({ success: true }),
		},
		reason: jest.fn().mockResolvedValue({
			decision: "test",
			confidence: 0.9,
			reasoning: "test reasoning",
			escalate: false,
		}),
		escalate: jest.fn().mockResolvedValue(undefined),
		memory: {
			get: jest.fn().mockResolvedValue(null),
			set: jest.fn().mockResolvedValue(undefined),
			delete: jest.fn().mockResolvedValue(undefined),
		},
		log: {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
		...overrides,
	};
}

// Test utilities
export class AgentTestUtils {
	static mockHttpClient = new MockHttpClient();
	static agentsService = new AgentsService(this.mockHttpClient as any);

	static resetMocks() {
		AgentTestUtils.mockHttpClient.reset();
	}

	static setupMockAgent(agentData: any) {
		AgentTestUtils.mockHttpClient.setMockResponse("/agents", agentData);
		AgentTestUtils.mockHttpClient.setMockResponse(
			"/agents/test-agent",
			agentData,
		);
	}

	static setupMockDeployment(deploymentData: any) {
		AgentTestUtils.mockHttpClient.setMockResponse(
			"/agents/test-agent/deploy",
			deploymentData,
		);
	}

	static getHttpClientCalls() {
		return AgentTestUtils.mockHttpClient.getCalls();
	}
}

// Test scenarios
export const testScenarios = {
	// Basic message handling test
	basicMessageHandling: {
		name: "Basic Message Handling",
		setup: () => {
			const context = createMockContext({
				event: {
					type: "message.received",
					payload: { message: "Hello world", userId: "user-123" },
					entityId: "user-123",
					entityType: "user",
					timestamp: new Date(),
				},
			});
			return context;
		},
		expectedBehaviors: [
			"Should process the message",
			"Should store interaction in memory",
			"Should send response",
			"Should log processing steps",
		],
	},

	// Order processing test
	orderProcessing: {
		name: "Order Processing Workflow",
		setup: () => {
			const context = createMockContext({
				event: {
					type: "order.created",
					payload: {
						id: "order-123",
						customerId: "customer-456",
						total: 99.99,
						items: [{ productId: "product-1", quantity: 2, price: 49.99 }],
						paymentMethod: "credit_card",
					},
					entityId: "order-123",
					entityType: "order",
					timestamp: new Date(),
				},
			});
			return context;
		},
		expectedBehaviors: [
			"Should validate order details",
			"Should check inventory",
			"Should process payment",
			"Should update order status",
			"Should trigger fulfillment",
		],
	},

	// Escalation test
	escalationHandling: {
		name: "Escalation Handling",
		setup: () => {
			const context = createMockContext({
				event: {
					type: "escalation.created",
					payload: {
						id: "escalation-789",
						urgency: "high",
						reason: "Payment processing failed",
						context: { orderId: "order-123", error: "Card declined" },
					},
					entityId: "escalation-789",
					entityType: "escalation",
					timestamp: new Date(),
				},
			});
			return context;
		},
		expectedBehaviors: [
			"Should assess escalation urgency",
			"Should attempt automatic resolution",
			"Should notify human agent if needed",
			"Should log escalation handling",
		],
	},

	// Error handling test
	errorHandling: {
		name: "Error Handling and Recovery",
		setup: () => {
			const context = createMockContext({
				functions: {
					invoke: jest.fn().mockRejectedValue(new Error("Service unavailable")),
				},
			});
			return context;
		},
		expectedBehaviors: [
			"Should catch errors gracefully",
			"Should log error details",
			"Should escalate if necessary",
			"Should not crash the agent",
		],
	},
};

// Sample test handlers
export const testHandlers: Record<string, AgentHandler> = {
	simpleEcho: async (ctx) => {
		const { event, log } = ctx;
		log.info("Echo handler called", { eventType: event.type });

		if (event.type === "echo.request") {
			const message = event.payload.message as string;
			await ctx.functions.invoke("echo.response", {
				originalMessage: message,
				echoedMessage: `Echo: ${message}`,
				timestamp: new Date().toISOString(),
			});
		}
	},

	conditionalLogic: async (ctx) => {
		const { event, reason, log } = ctx;

		if (event.type === "conditional.test") {
			const condition = event.payload.condition as string;

			const decision = await reason({
				question: `Should we proceed with condition: "${condition}"?`,
				context: { condition },
				options: ["yes", "no", "maybe"],
			});

			if (decision.decision === "yes") {
				await ctx.functions.invoke("proceed", {
					condition,
					confidence: decision.confidence,
				});
			} else if (decision.decision === "no") {
				await ctx.functions.invoke("reject", {
					condition,
					reason: decision.reasoning,
				});
			} else {
				await ctx.escalate({
					reason: `Uncertain about condition: ${condition}`,
					urgency: "low",
					context: { condition, reasoning: decision.reasoning },
				});
			}

			log.info("Conditional logic executed", {
				condition,
				decision: decision.decision,
				confidence: decision.confidence,
			});
		}
	},

	memoryTest: async (ctx) => {
		const { event, memory, log } = ctx;

		if (event.type === "memory.test") {
			const key = event.payload.key as string;
			const value = event.payload.value;

			// Store value
			await memory.set(key, value, "1h");

			// Retrieve value
			const retrieved = await memory.get(key);

			// Verify
			const matches = JSON.stringify(retrieved) === JSON.stringify(value);

			await ctx.functions.invoke("memory.test.result", {
				key,
				value,
				retrieved,
				matches,
				timestamp: new Date().toISOString(),
			});

			log.info("Memory test completed", { key, matches });
		}
	},
};

// Performance test utilities
export class PerformanceTester {
	static async measureHandlerPerformance(
		handler: AgentHandler,
		context: AgentContext,
		iterations: number = 100,
	): Promise<{
		totalTime: number;
		averageTime: number;
		minTime: number;
		maxTime: number;
		successRate: number;
	}> {
		const times: number[] = [];
		let successes = 0;

		for (let i = 0; i < iterations; i++) {
			const startTime = Date.now();

			try {
				await handler(context);
				successes++;
			} catch (_error) {
				// Count failures but continue
			}

			const endTime = Date.now();
			times.push(endTime - startTime);
		}

		const totalTime = times.reduce((sum, time) => sum + time, 0);

		return {
			totalTime,
			averageTime: totalTime / iterations,
			minTime: Math.min(...times),
			maxTime: Math.max(...times),
			successRate: successes / iterations,
		};
	}
}

// Integration test example
export async function runIntegrationTest() {
	console.log("Running agent integration tests...");

	AgentTestUtils.resetMocks();

	// Setup mock agent
	const mockAgent = {
		id: "test-agent",
		name: "Test Agent",
		status: "active",
		createdAt: new Date().toISOString(),
	};

	AgentTestUtils.setupMockAgent(mockAgent);

	// Test agent creation
	const _agent = AgentTestUtils.agentsService
		.define("test-agent")
		.description("Test agent for integration testing")
		.trigger("test.event")
		.canRead("test-data")
		.canWrite("test-results")
		.canInvoke("test-action");

	console.log("Agent builder created successfully");

	// Test deployment
	const mockDeployment = {
		id: "deploy-123",
		agentId: "test-agent",
		environment: "test",
		status: "success",
		deployedAt: new Date().toISOString(),
	};

	AgentTestUtils.setupMockDeployment(mockDeployment);

	// Test handler execution
	const context = testScenarios.basicMessageHandling.setup();
	await testHandlers.simpleEcho(context);

	// Verify function calls
	const calls = AgentTestUtils.getHttpClientCalls();
	console.log("HTTP calls made:", calls.length);

	// Test performance
	const performance = await PerformanceTester.measureHandlerPerformance(
		testHandlers.simpleEcho,
		context,
		10,
	);

	console.log("Performance results:", performance);

	console.log("Integration tests completed successfully");
}

// Unit test examples (can be used with Jest/Vitest)
export const unitTests = {
	"should create agent builder": () => {
		AgentTestUtils.resetMocks();
		const agent = AgentTestUtils.agentsService.define("test-agent");
		expect(agent).toBeDefined();
	},

	"should handle message events": async () => {
		const context = testScenarios.basicMessageHandling.setup();
		await testHandlers.simpleEcho(context);

		expect(context.functions.invoke).toHaveBeenCalledWith(
			"echo.response",
			expect.objectContaining({
				originalMessage: "Hello world",
				echoedMessage: "Echo: Hello world",
			}),
		);
	},

	"should store and retrieve from memory": async () => {
		const context = testScenarios.memoryTest.setup();
		await testHandlers.memoryTest(context);

		expect(context.memory.set).toHaveBeenCalledWith(
			"test-key",
			"test-value",
			"1h",
		);
		expect(context.memory.get).toHaveBeenCalledWith("test-key");
	},

	"should handle conditional logic": async () => {
		const context = testScenarios.conditionalLogic.setup();
		await testHandlers.conditionalLogic(context);

		expect(context.reason).toHaveBeenCalledWith({
			question: expect.stringContaining("proceed with condition"),
			context: { condition: "test-condition" },
			options: ["yes", "no", "maybe"],
		});
	},
};

// Example usage
if (require.main === module) {
	runIntegrationTest()
		.then(() => console.log("All tests passed"))
		.catch(console.error);
}

export {
	createMockContext,
	AgentTestUtils,
	testScenarios,
	testHandlers,
	PerformanceTester,
	unitTests,
};
