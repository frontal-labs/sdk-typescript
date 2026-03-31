/**
 * Tool System Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to define, register, and execute custom tools for AI agents.
 */

import { z } from "zod";
import { AI } from "../src";

// Initialize the AI client
const ai = new AI();

async function toolSystemExample() {
	console.log("🚀 Starting Tool System Example\n");

	try {
		// Example 1: Define and register a simple calculator tool
		console.log("📝 Example 1: Calculator tool");

		const calculatorTool = ai.defineTool({
			name: "calculator",
			description: "Perform basic mathematical calculations",
			parameters: z.object({
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			}),
			execute: async (params) => {
				const { operation, a, b } = params;

				switch (operation) {
					case "add":
						return a + b;
					case "subtract":
						return a - b;
					case "multiply":
						return a * b;
					case "divide":
						return b !== 0 ? a / b : "Error: Division by zero";
					default:
						return "Error: Unknown operation";
				}
			},
		});

		// Register the tool
		ai.registerTool(calculatorTool);
		console.log("✅ Calculator tool registered");

		// Test the tool
		const testResult = await ai.executeTool("calculator", {
			operation: "add",
			a: 15,
			b: 7,
		});

		if (testResult.error) {
			console.error("❌ Error executing calculator:", testResult.error.message);
		} else {
			console.log("✅ Calculator result:", testResult.data);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Weather information tool
		console.log("📝 Example 2: Weather information tool");

		const weatherTool = ai.defineTool({
			name: "get_weather",
			description: "Get current weather information for a city",
			parameters: z.object({
				city: z.string().describe("City name"),
				units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
			}),
			execute: async (params) => {
				// Simulate API call to weather service
				const { city, units } = params;

				// Mock weather data
				const weatherData = {
					city: city,
					temperature: units === "celsius" ? 22 : 72,
					condition: "Partly cloudy",
					humidity: 65,
					windSpeed: 10,
					units: units,
				};

				return weatherData;
			},
		});

		ai.registerTool(weatherTool);
		console.log("✅ Weather tool registered");

		// Test the weather tool
		const weatherResult = await ai.executeTool("get_weather", {
			city: "San Francisco",
			units: "celsius",
		});

		if (weatherResult.error) {
			console.error("❌ Error getting weather:", weatherResult.error.message);
		} else {
			console.log(
				"✅ Weather result:",
				JSON.stringify(weatherResult.data, null, 2),
			);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Database query tool
		console.log("📝 Example 3: Database query tool");

		const databaseTool = ai.defineTool({
			name: "query_database",
			description: "Query a database for user information",
			parameters: z.object({
				table: z.enum(["users", "products", "orders"]),
				operation: z.enum(["select", "insert", "update", "delete"]),
				filters: z.record(z.any()).optional(),
				data: z.record(z.any()).optional(),
			}),
			execute: async (params) => {
				const { table, operation, filters, data } = params;

				// Simulate database operations
				switch (operation) {
					case "select":
						return {
							operation: "select",
							table,
							filters,
							results: [
								{ id: 1, name: "John Doe", email: "john@example.com" },
								{ id: 2, name: "Jane Smith", email: "jane@example.com" },
							],
						};
					case "insert":
						return {
							operation: "insert",
							table,
							data,
							insertedId: Math.floor(Math.random() * 1000),
						};
					case "update":
						return {
							operation: "update",
							table,
							filters,
							data,
							updatedRows: 1,
						};
					case "delete":
						return {
							operation: "delete",
							table,
							filters,
							deletedRows: 1,
						};
					default:
						return { error: "Unknown operation" };
				}
			},
		});

		ai.registerTool(databaseTool);
		console.log("✅ Database tool registered");

		// Test the database tool
		const dbResult = await ai.executeTool("query_database", {
			table: "users",
			operation: "select",
			filters: { active: true },
		});

		if (dbResult.error) {
			console.error("❌ Error querying database:", dbResult.error.message);
		} else {
			console.log("✅ Database query result:");
			console.log("   Found", dbResult.data.results.length, "users");
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: File operations tool
		console.log("📝 Example 4: File operations tool");

		const fileTool = ai.defineTool({
			name: "file_operations",
			description: "Perform file operations like read, write, and list",
			parameters: z.object({
				operation: z.enum(["read", "write", "list", "delete"]),
				path: z.string(),
				content: z.string().optional(),
			}),
			execute: async (params) => {
				const { operation, path, content } = params;

				// Simulate file operations (in real implementation, use actual file system)
				switch (operation) {
					case "read":
						return {
							operation: "read",
							path,
							content: "This is the content of " + path,
							size: 100,
						};
					case "write":
						return {
							operation: "write",
							path,
							content: content || "",
							bytesWritten: (content || "").length,
						};
					case "list":
						return {
							operation: "list",
							path,
							files: ["file1.txt", "file2.txt", "document.pdf"],
						};
					case "delete":
						return {
							operation: "delete",
							path,
							deleted: true,
						};
					default:
						return { error: "Unknown file operation" };
				}
			},
		});

		ai.registerTool(fileTool);
		console.log("✅ File operations tool registered");

		// Test the file tool
		const fileResult = await ai.executeTool("file_operations", {
			operation: "list",
			path: "/documents",
		});

		if (fileResult.error) {
			console.error("❌ Error with file operation:", fileResult.error.message);
		} else {
			console.log("✅ File operation result:");
			console.log("   Files:", fileResult.data.files);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 5: List all registered tools
		console.log("📝 Example 5: List all registered tools");

		const allTools = ai.getTools();
		console.log("✅ Registered tools:");
		allTools.forEach((tool, index) => {
			console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
		});
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Tool composition and chaining
async function toolCompositionExample() {
	console.log("🎯 Advanced Example: Tool Composition and Chaining\n");

	// Define a user authentication tool
	const authTool = ai.defineTool({
		name: "authenticate_user",
		description: "Authenticate a user with credentials",
		parameters: z.object({
			username: z.string(),
			password: z.string(),
		}),
		execute: async (params) => {
			const { username, password } = params;

			// Simulate authentication
			if (username === "admin" && password === "secure123") {
				return {
					success: true,
					userId: 1,
					token: "mock_jwt_token_12345",
					expiresAt: new Date(Date.now() + 3600000).toISOString(),
				};
			} else {
				return {
					success: false,
					error: "Invalid credentials",
				};
			}
		},
	});

	// Define a user profile tool that requires authentication
	const profileTool = ai.defineTool({
		name: "get_user_profile",
		description: "Get user profile information (requires authentication)",
		parameters: z.object({
			userId: z.number(),
			token: z.string(),
		}),
		execute: async (params) => {
			const { userId, token } = params;

			// Simulate token validation
			if (token === "mock_jwt_token_12345") {
				return {
					userId,
					name: "John Doe",
					email: "john@example.com",
					role: "administrator",
					lastLogin: new Date().toISOString(),
					preferences: {
						theme: "dark",
						notifications: true,
						language: "en",
					},
				};
			} else {
				return {
					error: "Invalid or expired token",
				};
			}
		},
	});

	// Register both tools
	ai.registerTool(authTool);
	ai.registerTool(profileTool);

	console.log("✅ Authentication and profile tools registered");

	// Demonstrate tool chaining
	console.log("\n🔗 Demonstrating tool chaining:");

	// Step 1: Authenticate
	const authResult = await ai.executeTool("authenticate_user", {
		username: "admin",
		password: "secure123",
	});

	if (authResult.error) {
		console.error("❌ Authentication failed:", authResult.error.message);
		return;
	}

	console.log("✅ Authentication successful");
	const authData = authResult.data as any;

	// Step 2: Get profile using token from step 1
	const profileResult = await ai.executeTool("get_user_profile", {
		userId: authData.userId,
		token: authData.token,
	});

	if (profileResult.error) {
		console.error("❌ Profile fetch failed:", profileResult.error.message);
	} else {
		console.log("✅ Profile retrieved successfully");
		console.log("   User:", (profileResult.data as any).name);
		console.log("   Role:", (profileResult.data as any).role);
	}
}

// Example: Error handling in tools
async function errorHandlingExample() {
	console.log("🎯 Example: Error Handling in Tools\n");

	// Define a tool that can fail
	const unreliableTool = ai.defineTool({
		name: "unstable_operation",
		description: "An operation that might fail randomly",
		parameters: z.object({
			shouldFail: z.boolean().default(false),
		}),
		execute: async (params) => {
			const { shouldFail } = params;

			if (shouldFail) {
				throw new Error("Simulated operation failure");
			}

			return {
				success: true,
				data: "Operation completed successfully",
				timestamp: new Date().toISOString(),
			};
		},
	});

	ai.registerTool(unreliableTool);
	console.log("✅ Unstable tool registered");

	// Test successful execution
	console.log("\n🧪 Testing successful execution:");
	const successResult = await ai.executeTool("unstable_operation", {
		shouldFail: false,
	});

	if (successResult.error) {
		console.error("❌ Unexpected error:", successResult.error.message);
	} else {
		console.log("✅ Success:", successResult.data);
	}

	// Test failed execution
	console.log("\n🧪 Testing failed execution:");
	const failResult = await ai.executeTool("unstable_operation", {
		shouldFail: true,
	});

	if (failResult.error) {
		console.log("✅ Expected error caught:", failResult.error.message);
	} else {
		console.log("❌ Unexpected success");
	}
}

// Example: Tool with complex data structures
async function complexDataExample() {
	console.log("🎯 Example: Complex Data Structures\n");

	const analysisTool = ai.defineTool({
		name: "data_analysis",
		description: "Perform complex data analysis with multiple parameters",
		parameters: z.object({
			dataset: z.array(
				z.object({
					id: z.number(),
					name: z.string(),
					value: z.number(),
					category: z.string(),
				}),
			),
			analysisType: z.enum(["statistical", "trend", "correlation"]),
			options: z.object({
				includeOutliers: z.boolean().default(true),
				confidenceLevel: z.number().min(0).max(1).default(0.95),
				groupBy: z.string().optional(),
			}),
		}),
		execute: async (params) => {
			const { dataset, analysisType, options } = params;

			// Perform analysis based on type
			switch (analysisType) {
				case "statistical":
					return {
						type: "statistical",
						mean:
							dataset.reduce((sum, item) => sum + item.value, 0) /
							dataset.length,
						median: calculateMedian(dataset.map((d) => d.value)),
						stdDev: calculateStdDev(dataset.map((d) => d.value)),
						outliers: options.includeOutliers
							? findOutliers(dataset.map((d) => d.value))
							: [],
					};
				case "trend":
					return {
						type: "trend",
						trend: calculateTrend(dataset),
						direction:
							dataset[dataset.length - 1].value > dataset[0].value
								? "increasing"
								: "decreasing",
						changePercent:
							((dataset[dataset.length - 1].value - dataset[0].value) /
								dataset[0].value) *
							100,
					};
				case "correlation":
					return {
						type: "correlation",
						correlation: calculateCorrelation(dataset),
						strength: "moderate", // Simplified
					};
				default:
					return { error: "Unknown analysis type" };
			}
		},
	});

	ai.registerTool(analysisTool);
	console.log("✅ Complex analysis tool registered");

	// Test with sample data
	const testData = {
		dataset: [
			{ id: 1, name: "Product A", value: 100, category: "electronics" },
			{ id: 2, name: "Product B", value: 150, category: "electronics" },
			{ id: 3, name: "Product C", value: 120, category: "electronics" },
			{ id: 4, name: "Product D", value: 180, category: "electronics" },
		],
		analysisType: "statistical" as const,
		options: {
			includeOutliers: true,
			confidenceLevel: 0.95,
		},
	};

	const result = await ai.executeTool("data_analysis", testData);

	if (result.error) {
		console.error("❌ Analysis failed:", result.error.message);
	} else {
		console.log("✅ Analysis completed:");
		console.log("   Type:", (result.data as any).type);
		console.log("   Mean:", (result.data as any).mean?.toFixed(2));
	}
}

// Helper functions for complex analysis
function calculateMedian(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

function calculateStdDev(values: number[]): number {
	const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
	const variance =
		values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
	return Math.sqrt(variance);
}

function findOutliers(values: number[]): number[] {
	const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
	const stdDev = Math.sqrt(
		values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length,
	);
	return values.filter((val) => Math.abs(val - mean) > 2 * stdDev);
}

function calculateTrend(dataset: any[]): any {
	// Simple linear trend calculation
	const n = dataset.length;
	const sumX = (n * (n - 1)) / 2;
	const sumY = dataset.reduce((sum, item) => sum + item.value, 0);
	const sumXY = dataset.reduce(
		(sum, item, index) => sum + index * item.value,
		0,
	);
	const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;

	return { slope, intercept };
}

function calculateCorrelation(dataset: any[]): number {
	// Simplified correlation calculation
	const n = dataset.length;
	const values = dataset.map((d) => d.value);
	const mean = values.reduce((sum, val) => sum + val, 0) / n;

	let numerator = 0;
	let denominator = 0;

	for (let i = 0; i < n; i++) {
		const deviation = values[i] - mean;
		numerator += (i - (n - 1) / 2) * deviation;
		denominator += deviation ** 2;
	}

	return denominator === 0 ? 0 : numerator / denominator;
}

// Run the examples
if (import.meta.main) {
	await toolSystemExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await toolCompositionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await errorHandlingExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await complexDataExample();
}

export {
	toolSystemExample,
	toolCompositionExample,
	errorHandlingExample,
	complexDataExample,
};
