/**
 * Testing examples for Frontal Functions
 *
 * This example demonstrates testing patterns and strategies:
 * - Unit testing function deployments
 * - Integration testing with mock functions
 * - Performance testing
 * - Load testing
 * - End-to-end testing
 */

import { Functions, type FunctionConfig } from "@frontal/functions";

// Mock implementation for testing
class MockFunctions {
	private deployedFunctions = new Map<
		string,
		FunctionConfig & { id: string; createdAt: string; updatedAt: string }
	>();
	private invocationStats = new Map<
		string,
		{ invocations: number; errors: number; averageDuration: number }
	>();
	private nextId = 1;

	async deploy(config: FunctionConfig) {
		const id = `func-${this.nextId++}`;
		const now = new Date().toISOString();

		const functionEntry = {
			...config,
			id,
			createdAt: now,
			updatedAt: now,
		};

		this.deployedFunctions.set(id, functionEntry);
		this.invocationStats.set(id, {
			invocations: 0,
			errors: 0,
			averageDuration: 0,
		});

		return {
			data: functionEntry,
			error: null,
			headers: {},
		};
	}

	async list() {
		const functions = Array.from(this.deployedFunctions.values());
		return {
			data: functions,
			error: null,
			headers: {},
		};
	}

	async getFunction(id: string) {
		const func = this.deployedFunctions.get(id);
		if (!func) {
			return {
				data: null,
				error: {
					message: `Function ${id} not found`,
					statusCode: 404,
					name: "not_found",
				},
				headers: null,
			};
		}

		return {
			data: func,
			error: null,
			headers: {},
		};
	}

	async deleteFunction(id: string) {
		const existed = this.deployedFunctions.delete(id);
		this.invocationStats.delete(id);

		if (!existed) {
			return {
				data: null,
				error: {
					message: `Function ${id} not found`,
					statusCode: 404,
					name: "not_found",
				},
				headers: null,
			};
		}

		return {
			data: undefined,
			error: null,
			headers: {},
		};
	}

	async invoke(
		id: string,
		options: { payload?: unknown; headers?: Record<string, string> } = {},
	) {
		const func = this.deployedFunctions.get(id);
		if (!func) {
			return {
				data: null,
				error: {
					message: `Function ${id} not found`,
					statusCode: 404,
					name: "not_found",
				},
				headers: null,
			};
		}

		const stats = this.invocationStats.get(id)!;
		stats.invocations++;

		// Simulate function execution
		const startTime = Date.now();
		let result: unknown;
		let error: { message: string; statusCode: number; name: string } | null =
			null;

		try {
			// Simulate different function behaviors based on payload
			if (
				options.payload &&
				typeof options.payload === "object" &&
				"simulateError" in options.payload
			) {
				throw new Error("Simulated function error");
			}

			// Simulate successful execution
			result = {
				message: "Function executed successfully",
				input: options.payload,
				timestamp: new Date().toISOString(),
				functionId: id,
			};
		} catch (e) {
			stats.errors++;
			error = {
				message: e instanceof Error ? e.message : "Unknown error",
				statusCode: 500,
				name: "function_error",
			};
		}

		const duration = Date.now() - startTime;
		stats.averageDuration =
			(stats.averageDuration * (stats.invocations - 1) + duration) /
			stats.invocations;

		return {
			data: result,
			error,
			headers: {},
		};
	}

	async stats(id: string) {
		const func = this.deployedFunctions.get(id);
		const stats = this.invocationStats.get(id);

		if (!func || !stats) {
			return {
				data: null,
				error: {
					message: `Function ${id} not found`,
					statusCode: 404,
					name: "not_found",
				},
				headers: null,
			};
		}

		return {
			data: {
				functionId: id,
				totalInvocations: stats.invocations,
				errors: stats.errors,
				averageDuration: stats.averageDuration,
				lastInvoked: new Date().toISOString(),
			},
			error: null,
			headers: {},
		};
	}

	async updateTriggers(id: string, trigger: FunctionConfig["trigger"]) {
		const func = this.deployedFunctions.get(id);
		if (!func) {
			return {
				data: null,
				error: {
					message: `Function ${id} not found`,
					statusCode: 404,
					name: "not_found",
				},
				headers: null,
			};
		}

		const updatedFunc = {
			...func,
			trigger,
			updatedAt: new Date().toISOString(),
		};
		this.deployedFunctions.set(id, updatedFunc);

		return {
			data: updatedFunc,
			error: null,
			headers: {},
		};
	}
}

// Test utilities
class TestRunner {
	private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
	private results: Array<{ name: string; passed: boolean; error?: string }> =
		[];

	test(name: string, fn: () => Promise<void>) {
		this.tests.push({ name, fn });
	}

	async run() {
		console.log(`Running ${this.tests.length} tests...\n`);

		for (const test of this.tests) {
			try {
				await test.fn();
				this.results.push({ name: test.name, passed: true });
				console.log(`✓ ${test.name}`);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				this.results.push({
					name: test.name,
					passed: false,
					error: errorMessage,
				});
				console.log(`✗ ${test.name}: ${errorMessage}`);
			}
		}

		const passed = this.results.filter((r) => r.passed).length;
		const failed = this.results.length - passed;

		console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

		if (failed > 0) {
			console.log("\nFailed tests:");
			this.results
				.filter((r) => !r.passed)
				.forEach((r) => console.log(`- ${r.name}: ${r.error}`));
		}

		return this.results;
	}
}

// Example 1: Unit tests for function deployment
async function testFunctionDeployment() {
	const runner = new TestRunner();
	const mockFunctions = new MockFunctions();

	runner.test("should deploy a valid function", async () => {
		const config: FunctionConfig = {
			name: "test-function",
			runtime: "nodejs20",
			handler: "index.handler",
			memory: 256,
			timeout: 30,
		};

		const result = await mockFunctions.deploy(config);

		if (result.error) {
			throw new Error(`Deployment failed: ${result.error.message}`);
		}

		if (!result.data) {
			throw new Error("No data returned from deployment");
		}

		if (result.data.name !== config.name) {
			throw new Error(`Expected name ${config.name}, got ${result.data.name}`);
		}
	});

	runner.test("should list deployed functions", async () => {
		// Deploy a function first
		const config: FunctionConfig = {
			name: "list-test-function",
			runtime: "nodejs20",
			handler: "index.handler",
			memory: 256,
			timeout: 30,
		};

		await mockFunctions.deploy(config);

		const result = await mockFunctions.list();

		if (result.error) {
			throw new Error(`List failed: ${result.error.message}`);
		}

		if (!result.data || result.data.length === 0) {
			throw new Error("No functions returned");
		}
	});

	return runner.run();
}

// Example 2: Integration tests for function invocation
async function testFunctionInvocation() {
	const runner = new TestRunner();
	const mockFunctions = new MockFunctions();

	// Setup: deploy a test function
	const deployResult = await mockFunctions.deploy({
		name: "invocation-test",
		runtime: "nodejs20",
		handler: "index.handler",
		memory: 256,
		timeout: 30,
	});

	const functionId = deployResult.data!.id;

	runner.test("should invoke function successfully", async () => {
		const result = await mockFunctions.invoke(functionId, {
			payload: { message: "test" },
		});

		if (result.error) {
			throw new Error(`Invocation failed: ${result.error.message}`);
		}

		if (!result.data) {
			throw new Error("No data returned from invocation");
		}
	});

	runner.test("should handle invocation errors", async () => {
		const result = await mockFunctions.invoke(functionId, {
			payload: { simulateError: true },
		});

		if (!result.error) {
			throw new Error("Expected error but got success");
		}

		if (result.error.name !== "function_error") {
			throw new Error(`Expected function_error, got ${result.error.name}`);
		}
	});

	runner.test("should return not found for invalid function", async () => {
		const result = await mockFunctions.invoke("invalid-function-id");

		if (!result.error) {
			throw new Error("Expected error but got success");
		}

		if (result.error.statusCode !== 404) {
			throw new Error(`Expected 404, got ${result.error.statusCode}`);
		}
	});

	return runner.run();
}

// Example 3: Performance testing
async function performanceTest() {
	const mockFunctions = new MockFunctions();

	// Deploy a test function
	const deployResult = await mockFunctions.deploy({
		name: "perf-test",
		runtime: "nodejs20",
		handler: "index.handler",
		memory: 256,
		timeout: 30,
	});

	const functionId = deployResult.data!.id;

	console.log("Running performance test...");

	const iterations = 100;
	const startTime = Date.now();
	const errors: string[] = [];

	for (let i = 0; i < iterations; i++) {
		const result = await mockFunctions.invoke(functionId, {
			payload: { iteration: i },
		});

		if (result.error) {
			errors.push(`Iteration ${i}: ${result.error.message}`);
		}
	}

	const duration = Date.now() - startTime;
	const avgDuration = duration / iterations;
	const errorRate = errors.length / iterations;

	console.log(`Performance Test Results:`);
	console.log(`- Total iterations: ${iterations}`);
	console.log(`- Total duration: ${duration}ms`);
	console.log(`- Average duration: ${avgDuration.toFixed(2)}ms`);
	console.log(`- Error rate: ${(errorRate * 100).toFixed(2)}%`);

	if (errors.length > 0) {
		console.log(`- First few errors: ${errors.slice(0, 3).join(", ")}`);
	}

	return {
		iterations,
		duration,
		avgDuration,
		errorRate,
		errors: errors.length,
	};
}

// Example 4: Load testing
async function loadTest() {
	const mockFunctions = new MockFunctions();

	// Deploy multiple functions
	const functionIds = [];
	for (let i = 0; i < 5; i++) {
		const deployResult = await mockFunctions.deploy({
			name: `load-test-${i}`,
			runtime: "nodejs20",
			handler: "index.handler",
			memory: 256,
			timeout: 30,
		});
		functionIds.push(deployResult.data!.id);
	}

	console.log("Running load test...");

	const concurrentRequests = 20;
	const requestsPerFunction = 10;
	const startTime = Date.now();

	const promises = [];

	for (const functionId of functionIds) {
		for (let i = 0; i < requestsPerFunction; i++) {
			promises.push(
				mockFunctions.invoke(functionId, {
					payload: { requestId: `${functionId}-${i}` },
				}),
			);
		}
	}

	const results = await Promise.allSettled(promises);
	const duration = Date.now() - startTime;

	const successful = results.filter(
		(r) => r.status === "fulfilled" && !r.value.error,
	).length;

	const failed = results.length - successful;
	const throughput = results.length / (duration / 1000);

	console.log(`Load Test Results:`);
	console.log(`- Total requests: ${results.length}`);
	console.log(`- Concurrent requests: ${concurrentRequests}`);
	console.log(`- Duration: ${duration}ms`);
	console.log(`- Successful: ${successful}`);
	console.log(`- Failed: ${failed}`);
	console.log(`- Throughput: ${throughput.toFixed(2)} requests/second`);

	return {
		totalRequests: results.length,
		duration,
		successful,
		failed,
		throughput,
	};
}

// Example 5: End-to-end test
async function endToEndTest() {
	const mockFunctions = new MockFunctions();

	console.log("Running end-to-end test...");

	// Step 1: Deploy function
	console.log("Step 1: Deploying function...");
	const deployResult = await mockFunctions.deploy({
		name: "e2e-test",
		runtime: "nodejs20",
		handler: "index.handler",
		memory: 256,
		timeout: 30,
		trigger: {
			type: "http",
		},
	});

	if (deployResult.error) {
		throw new Error(`Deployment failed: ${deployResult.error.message}`);
	}

	const functionId = deployResult.data!.id;
	console.log(`✓ Function deployed with ID: ${functionId}`);

	// Step 2: List functions
	console.log("Step 2: Listing functions...");
	const listResult = await mockFunctions.list();

	if (listResult.error || !listResult.data) {
		throw new Error("Failed to list functions");
	}

	const deployedFunction = listResult.data.find((f) => f.id === functionId);
	if (!deployedFunction) {
		throw new Error("Deployed function not found in list");
	}

	console.log(`✓ Function found in list: ${deployedFunction.name}`);

	// Step 3: Get function details
	console.log("Step 3: Getting function details...");
	const getResult = await mockFunctions.get(functionId);

	if (getResult.error || !getResult.data) {
		throw new Error("Failed to get function details");
	}

	console.log(`✓ Function details retrieved`);

	// Step 4: Invoke function
	console.log("Step 4: Invoking function...");
	const invokeResult = await mockFunctions.invoke(functionId, {
		payload: { test: "e2e" },
	});

	if (invokeResult.error) {
		throw new Error(
			`Function invocation failed: ${invokeResult.error.message}`,
		);
	}

	console.log(`✓ Function invoked successfully`);

	// Step 5: Get invocation stats
	console.log("Step 5: Getting invocation stats...");
	const statsResult = await mockFunctions.stats(functionId);

	if (statsResult.error || !statsResult.data) {
		throw new Error("Failed to get invocation stats");
	}

	console.log(
		`✓ Stats retrieved: ${statsResult.data.totalInvocations} invocations`,
	);

	// Step 6: Update triggers
	console.log("Step 6: Updating triggers...");
	const updateResult = await mockFunctions.updateTriggers(functionId, {
		type: "cron",
		schedule: "0 9 * * *",
	});

	if (updateResult.error) {
		throw new Error(`Failed to update triggers: ${updateResult.error.message}`);
	}

	console.log(`✓ Triggers updated successfully`);

	// Step 7: Delete function
	console.log("Step 7: Deleting function...");
	const deleteResult = await mockFunctions.delete(functionId);

	if (deleteResult.error) {
		throw new Error(`Failed to delete function: ${deleteResult.error.message}`);
	}

	console.log(`✓ Function deleted successfully`);

	console.log("End-to-end test completed successfully!");
	return true;
}

// Export test functions
export {
	MockFunctions,
	TestRunner,
	testFunctionDeployment,
	testFunctionInvocation,
	performanceTest,
	loadTest,
	endToEndTest,
};

// Run tests if this file is executed directly
if (import.meta.main) {
	async function runAllTests() {
		console.log("=== Function Deployment Tests ===");
		await testFunctionDeployment();

		console.log("\n=== Function Invocation Tests ===");
		await testFunctionInvocation();

		console.log("\n=== Performance Test ===");
		await performanceTest();

		console.log("\n=== Load Test ===");
		await loadTest();

		console.log("\n=== End-to-End Test ===");
		await endToEndTest();
	}

	runAllTests().catch(console.error);
}
