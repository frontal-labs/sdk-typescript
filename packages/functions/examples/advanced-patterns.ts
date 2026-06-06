/**
 * Advanced usage patterns for Frontal Functions
 *
 * This example demonstrates advanced patterns and best practices:
 * - Function composition and chaining
 * - Parallel execution
 * - Caching strategies
 * - Monitoring and observability
 * - Function orchestration
 */

import { type InvokeOptions, functions } from "@frontal-labs/functions";


// Example 1: Function composition - chaining multiple functions
async function processPipeline(inputData: unknown) {
	console.log("Running function pipeline...");

	// Step 1: Data validation
	const validation = await functions.invoke("data-validator", {
		payload: inputData,
	});

	if (validation.error) {
		throw new Error(`Validation failed: ${validation.error.message}`);
	}

	// Step 2: Data transformation
	const transformation = await functions.invoke("data-transformer", {
		payload: validation.data,
	});

	if (transformation.error) {
		throw new Error(`Transformation failed: ${transformation.error.message}`);
	}

	// Step 3: Data enrichment
	const enrichment = await functions.invoke("data-enricher", {
		payload: transformation.data,
	});

	if (enrichment.error) {
		throw new Error(`Enrichment failed: ${enrichment.error.message}`);
	}

	// Step 4: Store results
	const storage = await functions.invoke("data-storage", {
		payload: enrichment.data,
	});

	if (storage.error) {
		throw new Error(`Storage failed: ${storage.error.message}`);
	}

	return {
		validation: validation.data,
		transformation: transformation.data,
		enrichment: enrichment.data,
		storage: storage.data,
	};
}

// Example 2: Parallel function execution
async function parallelProcessing(items: unknown[]) {
	console.log(`Processing ${items.length} items in parallel...`);

	const batchSize = 10; // Process in batches to avoid overwhelming the system
	const results = [];

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);

		const batchPromises = batch.map((item, index) =>
			functions.invoke("item-processor", {
				payload: { item, index: i + index },
			}),
		);

		const batchResults = await Promise.allSettled(batchPromises);

		batchResults.forEach((result, index) => {
			if (result.status === "fulfilled") {
				if (result.value.error) {
					results.push({
						index: i + index,
						success: false,
						error: result.value.error.message,
					});
				} else {
					results.push({
						index: i + index,
						success: true,
						data: result.value.data,
					});
				}
			} else {
				results.push({
					index: i + index,
					success: false,
					error: result.reason.message,
				});
			}
		});
	}

	return results;
}

// Example 3: Map-reduce pattern
async function mapReduce(data: unknown[]) {
	console.log(`Running map-reduce on ${data.length} items...`);

	// Map phase: process each item in parallel
	const mapPromises = data.map((item, index) =>
		functions.invoke("mapper", {
			payload: { item, index },
		}),
	);

	const mapResults = await Promise.all(mapPromises);
	const mappedData = mapResults
		.filter((result) => !result.error)
		.map((result) => result.data);

	// Reduce phase: aggregate results
	const reduceResult = await functions.invoke("reducer", {
		payload: mappedData,
	});

	if (reduceResult.error) {
		throw new Error(`Reduce phase failed: ${reduceResult.error.message}`);
	}

	return reduceResult.data;
}

// Example 4: Fan-out/fan-in pattern
async function fanOutFanIn(triggerData: unknown) {
	console.log("Running fan-out/fan-in pattern...");

	// Step 1: Determine which functions to call
	const routerResult = await functions.invoke("function-router", {
		payload: triggerData,
	});

	if (routerResult.error) {
		throw new Error(`Routing failed: ${routerResult.error.message}`);
	}

	const functionsToCall = routerResult.data as string[];

	// Step 2: Fan-out - call all functions in parallel
	const fanOutPromises = functionsToCall.map((funcName) =>
		functions.invoke(funcName, { payload: triggerData }),
	);

	const fanOutResults = await Promise.allSettled(fanOutPromises);

	// Step 3: Fan-in - collect and aggregate results
	const successfulResults = fanOutResults
		.filter(
			(result): result is PromiseFulfilledResult<{ data: unknown }> =>
				result.status === "fulfilled" && !result.value.error,
		)
		.map((result) => result.value.data);

	const failedResults = fanOutResults.filter(
		(result) =>
			result.status === "rejected" ||
			(result.status === "fulfilled" && result.value.error),
	);

	// Step 4: Aggregate results
	const aggregatorResult = await functions.invoke("result-aggregator", {
		payload: {
			successful: successfulResults,
			failed: failedResults.map((result) =>
				result.status === "rejected"
					? result.reason.message
					: result.value.error?.message,
			),
		},
	});

	if (aggregatorResult.error) {
		throw new Error(`Aggregation failed: ${aggregatorResult.error.message}`);
	}

	return aggregatorResult.data;
}

// Example 5: Caching strategy
class FunctionCache {
	private cache = new Map<string, { data: unknown; expiry: number }>();

	constructor(private ttlMs = 300000) {} // 5 minutes default TTL

	private getCacheKey(functionId: string, options: InvokeOptions): string {
		return `${functionId}:${JSON.stringify(options.payload || {})}`;
	}

	async invokeWithCache(functionId: string, options: InvokeOptions = {}) {
		const cacheKey = this.getCacheKey(functionId, options);
		const cached = this.cache.get(cacheKey);

		// Check cache first
		if (cached && Date.now() < cached.expiry) {
			console.log(`Cache hit for ${functionId}`);
			return { data: cached.data, error: null };
		}

		// Cache miss or expired, invoke function
		console.log(`Cache miss for ${functionId}, invoking...`);
		const result = await functions.invoke(functionId, options);

		// Cache successful results
		if (!result.error && result.data !== null) {
			this.cache.set(cacheKey, {
				data: result.data,
				expiry: Date.now() + this.ttlMs,
			});
		}

		return result;
	}

	clearCache() {
		this.cache.clear();
	}

	getCacheSize() {
		return this.cache.size;
	}
}

// Example 6: Monitoring and observability
class FunctionMonitor {
	private metrics = {
		invocations: 0,
		errors: 0,
		totalDuration: 0,
		functionStats: new Map<
			string,
			{ count: number; errors: number; duration: number }
		>(),
	};

	async invokeWithMetrics(functionId: string, options: InvokeOptions = {}) {
		const startTime = Date.now();
		this.metrics.invocations++;

		const functionStats = this.metrics.functionStats.get(functionId) || {
			count: 0,
			errors: 0,
			duration: 0,
		};

		functionStats.count++;
		this.metrics.functionStats.set(functionId, functionStats);

		try {
			const result = await functions.invoke(functionId, options);
			const duration = Date.now() - startTime;

			this.metrics.totalDuration += duration;
			functionStats.duration += duration;

			if (result.error) {
				this.metrics.errors++;
				functionStats.errors++;
			}

			// Log metrics
			console.log(
				`Function ${functionId}: ${duration}ms, ${result.error ? "ERROR" : "SUCCESS"}`,
			);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.metrics.errors++;
			functionStats.errors++;
			functionStats.duration += duration;

			console.error(
				`Function ${functionId}: ${duration}ms, EXCEPTION: ${error}`,
			);
			throw error;
		}
	}

	getMetrics() {
		const avgDuration =
			this.metrics.invocations > 0
				? this.metrics.totalDuration / this.metrics.invocations
				: 0;

		return {
			...this.metrics,
			averageDuration: avgDuration,
			errorRate:
				this.metrics.invocations > 0
					? this.metrics.errors / this.metrics.invocations
					: 0,
		};
	}

	resetMetrics() {
		this.metrics = {
			invocations: 0,
			errors: 0,
			totalDuration: 0,
			functionStats: new Map(),
		};
	}
}

// Example 7: Workflow orchestration
class WorkflowOrchestrator {
	private workflows = new Map<string, WorkflowStep[]>();

	addWorkflow(name: string, steps: WorkflowStep[]) {
		this.workflows.set(name, steps);
	}

	async executeWorkflow(name: string, initialData: unknown) {
		const workflow = this.workflows.get(name);
		if (!workflow) {
			throw new Error(`Workflow ${name} not found`);
		}

		console.log(`Executing workflow: ${name}`);
		let currentData = initialData;
		const results = [];

		for (const step of workflow) {
			console.log(`Executing step: ${step.name}`);

			try {
				const result = await functions.invoke(step.functionId, {
					payload: currentData,
					headers: step.headers,
				});

				if (result.error) {
					if (step.optional) {
						console.warn(
							`Optional step ${step.name} failed: ${result.error.message}`,
						);
						results.push({
							step: step.name,
							success: false,
							error: result.error.message,
						});
						continue;
					} else {
						throw new Error(
							`Step ${step.name} failed: ${result.error.message}`,
						);
					}
				}

				currentData = result.data;
				results.push({ step: step.name, success: true, data: result.data });

				// Add delay between steps if specified
				if (step.delayMs) {
					await new Promise((resolve) => setTimeout(resolve, step.delayMs));
				}
			} catch (error) {
				console.error(`Step ${step.name} threw exception:`, error);
				results.push({
					step: step.name,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				if (!step.optional) {
					throw error;
				}
			}
		}

		return { finalData: currentData, steps: results };
	}
}

interface WorkflowStep {
	name: string;
	functionId: string;
	headers?: Record<string, string>;
	optional?: boolean;
	delayMs?: number;
}

// Example usage of the orchestrator
async function setupWorkflowExample() {
	const orchestrator = new WorkflowOrchestrator();

	// Define a data processing workflow
	orchestrator.addWorkflow("data-processing", [
		{
			name: "validate-input",
			functionId: "input-validator",
		},
		{
			name: "clean-data",
			functionId: "data-cleaner",
		},
		{
			name: "enrich-data",
			functionId: "data-enricher",
			optional: true, // This step can fail without stopping the workflow
		},
		{
			name: "transform-data",
			functionId: "data-transformer",
			delayMs: 1000, // Wait 1 second before this step
		},
		{
			name: "store-results",
			functionId: "result-storage",
		},
	]);

	// Execute the workflow
	const result = await orchestrator.executeWorkflow("data-processing", {
		rawData: "sample input data",
	});

	console.log("Workflow completed:", result);
	return result;
}

// Export examples
export {
	processPipeline,
	parallelProcessing,
	mapReduce,
	fanOutFanIn,
	FunctionCache,
	FunctionMonitor,
	WorkflowOrchestrator,
	setupWorkflowExample,
};

// Run examples if this file is executed directly
if (import.meta.main) {
	setupWorkflowExample().catch(console.error);
}
