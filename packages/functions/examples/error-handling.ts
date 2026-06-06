/**
 * Error handling examples for Frontal Functions
 *
 * This example demonstrates proper error handling patterns:
 * - Handling API errors
 * - Validation errors
 * - Network errors
 * - Retry patterns
 * - Graceful degradation
 */

import { type FunctionConfig, functions } from "@frontal-labs/functions";


// Example 1: Basic error handling
async function deployWithErrorHandling() {
	console.log("Deploying function with error handling...");

	const config: FunctionConfig = {
		name: "error-example",
		runtime: "nodejs20",
		handler: "index.handler",
		memory: 256,
		timeout: 30,
	};

	const result = await functions.deploy(config);

	if (result.error) {
		// Handle different types of errors
		switch (result.error.name) {
			case "validation_error":
				console.error("Validation failed:", result.error.message);
				// Fix validation issues and retry
				break;
			case "authentication_error":
				console.error("Authentication failed:", result.error.message);
				// Check API key and permissions
				break;
			case "rate_limit_error":
				console.error("Rate limit exceeded:", result.error.message);
				// Implement backoff and retry
				break;
			default:
				console.error("Unknown error:", result.error.message);
		}
		return null;
	}

	console.log("Function deployed successfully:", result.data);
	return result.data;
}

// Example 2: Retry pattern with exponential backoff
async function invokeWithRetry(functionId: string, maxRetries = 3) {
	console.log(`Invoking function ${functionId} with retry logic...`);

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const result = await functions.invoke(functionId, {
				payload: { attempt },
			});

			if (result.error) {
				console.error(`Attempt ${attempt} failed:`, result.error.message);

				if (attempt === maxRetries) {
					console.error("Max retries reached, giving up");
					return null;
				}

				// Exponential backoff: wait 1s, 2s, 4s, etc.
				const delay = 2 ** (attempt - 1) * 1000;
				console.log(`Retrying in ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			console.log("Function invoked successfully:", result.data);
			return result.data;
		} catch (error) {
			console.error(`Attempt ${attempt} threw exception:`, error);

			if (attempt === maxRetries) {
				console.error("Max retries reached, giving up");
				return null;
			}
		}
	}

	return null;
}

// Example 3: Graceful degradation
async function getFunctionWithFallback(functionId: string) {
	console.log(`Getting function ${functionId} with fallback...`);

	const result = await functions.get(functionId);

	if (result.error) {
		console.warn("Failed to get function details:", result.error.message);

		// Return a default/placeholder function object
		return {
			id: functionId,
			name: "Unknown Function",
			runtime: "unknown",
			status: "error",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}

	return result.data;
}

// Example 4: Batch operations with error collection
async function deployMultipleFunctions(configs: FunctionConfig[]) {
	console.log(`Deploying ${configs.length} functions...`);

	const results = [];
	const errors = [];

	for (const config of configs) {
		try {
			const result = await functions.deploy(config);

			if (result.error) {
				errors.push({
					functionName: config.name,
					error: result.error,
				});
			} else {
				results.push(result.data);
			}
		} catch (error) {
			errors.push({
				functionName: config.name,
				error: {
					name: "exception",
					message: error instanceof Error ? error.message : "Unknown error",
					statusCode: 0,
				},
			});
		}
	}

	console.log(`Successfully deployed ${results.length} functions`);
	console.log(`Failed to deploy ${errors.length} functions`);

	if (errors.length > 0) {
		console.log("Errors:");
		errors.forEach(({ functionName, error }) => {
			console.log(`- ${functionName}: ${error.message}`);
		});
	}

	return { results, errors };
}

// Example 5: Timeout handling
async function invokeWithTimeout(functionId: string, timeoutMs = 10000) {
	console.log(`Invoking function ${functionId} with timeout ${timeoutMs}ms...`);

	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => reject(new Error("Invocation timeout")), timeoutMs);
	});

	const invokePromise = functions.invoke(functionId, {
		payload: { timeout: timeoutMs },
	});

	try {
		const result = await Promise.race([invokePromise, timeoutPromise]);

		if (result instanceof Error) {
			throw result;
		}

		if (result.error) {
			console.error("Function returned error:", result.error.message);
			return null;
		}

		console.log("Function invoked successfully:", result.data);
		return result.data;
	} catch (error) {
		if (error instanceof Error && error.message === "Invocation timeout") {
			console.error("Function invocation timed out");
			return null;
		}

		console.error("Invocation failed:", error);
		return null;
	}
}

// Example 6: Validation error handling
async function deployWithValidation() {
	console.log("Deploying function with validation checks...");

	// This will fail validation
	const invalidConfig = {
		name: "", // Empty name
		runtime: "invalid-runtime" as any,
		handler: "",
		memory: 64, // Too low
		timeout: 1000, // Too high
	};

	const result = await functions.deploy(invalidConfig);

	if (result.error && result.error.name === "validation_error") {
		console.error("Validation errors found:");

		// Parse validation error details
		try {
			const errorDetails = JSON.parse(result.error.message);
			Object.entries(errorDetails).forEach(([field, issues]) => {
				console.log(`- ${field}: ${issues}`);
			});
		} catch {
			console.error("Validation message:", result.error.message);
		}

		// Provide a corrected config
		const correctedConfig: FunctionConfig = {
			name: "corrected-function",
			runtime: "nodejs20",
			handler: "index.handler",
			memory: 256,
			timeout: 30,
		};

		console.log("Retrying with corrected configuration...");
		const retryResult = await functions.deploy(correctedConfig);

		if (retryResult.error) {
			console.error("Retry also failed:", retryResult.error.message);
		} else {
			console.log(
				"Function deployed successfully after correction:",
				retryResult.data,
			);
		}
	}
}

// Example 7: Circuit breaker pattern
class CircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

	constructor(
		private threshold = 5,
		private timeout = 60000, // 1 minute
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN") {
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = "HALF_OPEN";
			} else {
				throw new Error("Circuit breaker is OPEN");
			}
		}

		try {
			const result = await operation();

			if (this.state === "HALF_OPEN") {
				this.state = "CLOSED";
				this.failures = 0;
			}

			return result;
		} catch (error) {
			this.failures++;
			this.lastFailureTime = Date.now();

			if (this.failures >= this.threshold) {
				this.state = "OPEN";
			}

			throw error;
		}
	}
}

async function invokeWithCircuitBreaker(functionId: string) {
	console.log(`Invoking function ${functionId} with circuit breaker...`);

	const circuitBreaker = new CircuitBreaker();

	try {
		const result = await circuitBreaker.execute(async () => {
			const invokeResult = await functions.invoke(functionId);

			if (invokeResult.error) {
				throw new Error(invokeResult.error.message);
			}

			return invokeResult.data;
		});

		console.log("Function invoked successfully:", result);
		return result;
	} catch (error) {
		console.error("Circuit breaker prevented invocation:", error);
		return null;
	}
}

// Export examples
export {
	deployWithErrorHandling,
	invokeWithRetry,
	getFunctionWithFallback,
	deployMultipleFunctions,
	invokeWithTimeout,
	deployWithValidation,
	invokeWithCircuitBreaker,
};

// Run examples if this file is executed directly
if (import.meta.main) {
	deployWithErrorHandling().catch(console.error);
}
