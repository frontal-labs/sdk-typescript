/**
 * Basic usage examples for Frontal Functions
 *
 * This example demonstrates the core functionality of the Functions client:
 * - Deploying functions
 * - Listing functions
 * - Invoking functions
 * - Managing function lifecycle
 */

import { Functions, type FunctionConfig } from "@frontal/functions";

// Initialize the functions client
// Uses environment variables for authentication by default
const functions = new Functions();

// Example 1: Deploy a simple HTTP function
async function deployHttpFunction() {
	console.log("Deploying HTTP function...");

	const config: FunctionConfig = {
		name: "hello-world",
		runtime: "nodejs20",
		handler: "index.handler",
		memory: 256,
		timeout: 30,
		env: {
			NODE_ENV: "production",
		},
		trigger: {
			type: "http",
		},
	};

	const result = await functions.deploy(config);

	if (result.error) {
		console.error("Failed to deploy function:", result.error.message);
		return;
	}

	console.log("Function deployed successfully:", result.data);
	return result.data;
}

// Example 2: Deploy a scheduled (cron) function
async function deployScheduledFunction() {
	console.log("Deploying scheduled function...");

	const config: FunctionConfig = {
		name: "daily-report",
		runtime: "python3.9",
		handler: "main.generate_report",
		memory: 512,
		timeout: 300,
		env: {
			REPORT_EMAIL: "admin@example.com",
		},
		trigger: {
			type: "cron",
			schedule: "0 9 * * *", // Daily at 9 AM
		},
	};

	const result = await functions.deploy(config);

	if (result.error) {
		console.error("Failed to deploy scheduled function:", result.error.message);
		return;
	}

	console.log("Scheduled function deployed:", result.data);
	return result.data;
}

// Example 3: List all functions
async function listAllFunctions() {
	console.log("Listing all functions...");

	const result = await functions.list();

	if (result.error) {
		console.error("Failed to list functions:", result.error.message);
		return;
	}

	console.log(`Found ${result.data?.length || 0} functions:`);
	result.data?.forEach((func, index) => {
		console.log(`${index + 1}. ${func.name} (${func.id}) - ${func.runtime}`);
	});

	return result.data;
}

// Example 4: Get specific function details
async function getFunctionDetails(functionId: string) {
	console.log(`Getting details for function ${functionId}...`);

	const result = await functions.get(functionId);

	if (result.error) {
		console.error("Failed to get function details:", result.error.message);
		return;
	}

	console.log("Function details:", result.data);
	return result.data;
}

// Example 5: Invoke a function
async function invokeFunction(functionId: string) {
	console.log(`Invoking function ${functionId}...`);

	const result = await functions.invoke(functionId, {
		payload: {
			message: "Hello from the SDK!",
			timestamp: new Date().toISOString(),
		},
		headers: {
			"X-Custom-Header": "test-value",
		},
	});

	if (result.error) {
		console.error("Failed to invoke function:", result.error.message);
		return;
	}

	console.log("Function invocation result:", result.data);
	return result.data;
}

// Example 6: Get invocation statistics
async function getFunctionStats(functionId: string) {
	console.log(`Getting stats for function ${functionId}...`);

	const result = await functions.stats(functionId);

	if (result.error) {
		console.error("Failed to get function stats:", result.error.message);
		return;
	}

	console.log("Function statistics:", result.data);
	return result.data;
}

// Example 7: Update function triggers
async function updateFunctionTriggers(functionId: string) {
	console.log(`Updating triggers for function ${functionId}...`);

	const result = await functions.updateTriggers(functionId, {
		type: "cron",
		schedule: "0 */6 * * *", // Every 6 hours
	});

	if (result.error) {
		console.error("Failed to update triggers:", result.error.message);
		return;
	}

	console.log("Triggers updated successfully:", result.data);
	return result.data;
}

// Example 8: Delete a function
async function deleteFunction(functionId: string) {
	console.log(`Deleting function ${functionId}...`);

	const result = await functions.delete(functionId);

	if (result.error) {
		console.error("Failed to delete function:", result.error.message);
		return;
	}

	console.log("Function deleted successfully");
	return true;
}

// Example 9: Complete workflow
async function completeWorkflow() {
	console.log("Running complete function workflow...");

	try {
		// Deploy function
		const deployedFunction = await deployHttpFunction();
		if (!deployedFunction) return;

		// List functions to verify
		await listAllFunctions();

		// Get details
		await getFunctionDetails(deployedFunction.id);

		// Invoke the function
		await invokeFunction(deployedFunction.id);

		// Get stats
		await getFunctionStats(deployedFunction.id);

		// Update triggers
		await updateFunctionTriggers(deployedFunction.id);

		// Clean up (optional)
		// await deleteFunction(deployedFunction.id);

		console.log("Workflow completed successfully!");
	} catch (error) {
		console.error("Workflow failed:", error);
	}
}

// Example 10: Using custom configuration
async function customConfigExample() {
	console.log("Using custom client configuration...");

	// Initialize with custom configuration
	const customFunctions = new Functions({
		apiKey: "your-api-key-here",
		baseUrl: "https://api.frontal.dev",
		timeout: 30000,
		maxRetries: 3,
		headers: {
			"X-User-Agent": "MyApp/1.0",
		},
	});

	// Use the custom client
	const result = await customFunctions.list();

	if (result.error) {
		console.error("Failed with custom config:", result.error.message);
		return;
	}

	console.log("Functions listed with custom config:", result.data?.length);
}

// Export functions for use in other examples or tests
export {
	deployHttpFunction,
	deployScheduledFunction,
	listAllFunctions,
	getFunctionDetails,
	invokeFunction,
	getFunctionStats,
	updateFunctionTriggers,
	deleteFunction,
	completeWorkflow,
	customConfigExample,
};

// Run examples if this file is executed directly
if (import.meta.main) {
	completeWorkflow().catch(console.error);
}
