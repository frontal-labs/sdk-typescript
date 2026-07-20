import { FrontalClient } from "@frontal-labs/_core";
import { createGraphClient } from "@frontal-labs/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Batch create operations
async function batchCreateExample() {
	console.log("=== Batch Create Operations ===");

	try {
		// Prepare batch operations for creating multiple users
		const usersToCreate = [
			{
				name: "Alice Chen",
				email: "alice@example.com",
				role: "developer",
				department: "engineering",
			},
			{
				name: "Bob Wilson",
				email: "bob@example.com",
				role: "designer",
				department: "design",
			},
			{
				name: "Carol Davis",
				email: "carol@example.com",
				role: "manager",
				department: "product",
			},
			{
				name: "David Lee",
				email: "david@example.com",
				role: "developer",
				department: "engineering",
			},
		];

		const batchOperations = usersToCreate.map((userData, _index) => ({
			type: "create" as const,
			entityType: "user",
			entity: {
				data: userData,
			},
		}));

		// Execute batch operation
		const batchResult = await graphClient.batch(batchOperations);

		console.log("Batch create result:", batchResult);
		console.log(`Successfully created: ${batchResult.successful}`);
		console.log(`Failed: ${batchResult.failed}`);

		if (batchResult.errors.length > 0) {
			console.log("Errors:", batchResult.errors);
		}
	} catch (error) {
		console.error("Batch create failed:", error);
	}
}

// Example: Batch update operations
async function batchUpdateExample() {
	console.log("\n=== Batch Update Operations ===");

	try {
		// Batch update multiple entities
		const batchOperations = [
			{
				type: "update" as const,
				entityType: "user",
				id: "user-1",
				fields: {
					role: "senior-developer",
					salary: 95000,
				},
			},
			{
				type: "update" as const,
				entityType: "user",
				id: "user-2",
				fields: {
					role: "lead-designer",
					salary: 85000,
				},
			},
			{
				type: "update" as const,
				entityType: "user",
				id: "user-3",
				fields: {
					department: "senior-management",
					reports: 5,
				},
			},
		];

		const batchResult = await graphClient.batch(batchOperations);

		console.log("Batch update result:", batchResult);
		console.log(`Successfully updated: ${batchResult.successful}`);
	} catch (error) {
		console.error("Batch update failed:", error);
	}
}

// Example: Mixed batch operations
async function mixedBatchOperations() {
	console.log("\n=== Mixed Batch Operations ===");

	try {
		const batchOperations = [
			// Create new user
			{
				type: "create" as const,
				entityType: "user",
				entity: {
					data: {
						name: "Eva Martinez",
						email: "eva@example.com",
						role: "analyst",
					},
				},
			},

			// Update existing user
			{
				type: "update" as const,
				entityType: "user",
				id: "user-123",
				fields: {
					lastLogin: new Date().toISOString(),
					status: "active",
				},
			},

			// Delete user
			{
				type: "delete" as const,
				entityType: "user",
				id: "user-456",
			},

			// Create another user
			{
				type: "create" as const,
				entityType: "user",
				entity: {
					data: {
						name: "Frank Zhang",
						email: "frank@example.com",
						role: "developer",
					},
				},
			},
		];

		const batchResult = await graphClient.batch(batchOperations);

		console.log("Mixed batch result:", batchResult);
		console.log(`Total operations: ${batchResult.total}`);
		console.log(`Successful: ${batchResult.successful}`);
		console.log(`Failed: ${batchResult.failed}`);

		// Show detailed errors if any
		batchResult.errors.forEach((error) => {
			console.log(`Error at index ${error.index}: ${error.error}`);
			console.log(`Operation:`, error.entity);
		});
	} catch (error) {
		console.error("Mixed batch operations failed:", error);
	}
}

// Example: Batch operations with error handling
async function batchWithErrorHandling() {
	console.log("\n=== Batch Operations with Error Handling ===");

	try {
		// Intentionally include some invalid operations
		const batchOperations = [
			// Valid operation
			{
				type: "create" as const,
				entityType: "user",
				entity: {
					data: {
						name: "Grace Kim",
						email: "grace@example.com",
						role: "developer",
					},
				},
			},

			// Invalid operation - missing required field
			{
				type: "create" as const,
				entityType: "user",
				entity: {
					data: {
						name: "Henry Brown",
						// Missing email (required field)
					},
				},
			},

			// Valid operation
			{
				type: "update" as const,
				entityType: "user",
				id: "existing-user-123",
				fields: {
					status: "verified",
				},
			},

			// Invalid operation - non-existent user
			{
				type: "delete" as const,
				entityType: "user",
				id: "non-existent-user-999",
			},
		];

		const batchResult = await graphClient.batch(batchOperations);

		console.log("Batch result with errors:", batchResult);

		// Process successful operations
		if (batchResult.successful > 0) {
			console.log(
				`✅ ${batchResult.successful} operations completed successfully`,
			);
		}

		// Process errors
		if (batchResult.failed > 0) {
			console.log(`❌ ${batchResult.failed} operations failed`);

			batchResult.errors.forEach((error) => {
				console.log(`  • Operation ${error.index}: ${error.error}`);
			});
		}

		// Retry logic for failed operations
		const retryOperations = batchResult.errors
			.map((error) => {
				// Fix the invalid operation and retry
				if (error.index === 1) {
					// Fix missing email
					return {
						type: "create" as const,
						entityType: "user",
						entity: {
							data: {
								name: "Henry Brown",
								email: "henry@example.com", // Add missing email
								role: "developer",
							},
						},
					};
				}
				return null;
			})
			.filter(Boolean);

		if (retryOperations.length > 0) {
			console.log("\nRetrying failed operations...");
			const retryResult = await graphClient.batch(retryOperations);
			console.log("Retry result:", retryResult);
		}
	} catch (error) {
		console.error("Batch with error handling failed:", error);
	}
}

// Example: Performance comparison
async function performanceComparison() {
	console.log("\n=== Performance Comparison ===");

	try {
		const numberOfOperations = 100;
		const users = Array.from({ length: numberOfOperations }, (_, i) => ({
			name: `User ${i + 1}`,
			email: `user${i + 1}@example.com`,
			role: "employee",
		}));

		// Test individual operations
		console.log(`Testing ${numberOfOperations} individual operations...`);
		const individualStart = Date.now();

		for (const userData of users) {
			await graphClient.entities("user").create({
				data: userData,
			});
		}

		const individualEnd = Date.now();
		const individualTime = individualEnd - individualStart;

		console.log(`Individual operations took: ${individualTime}ms`);

		// Test batch operations
		console.log(`Testing ${numberOfOperations} batch operations...`);
		const batchStart = Date.now();

		const batchOperations = users.map((userData) => ({
			type: "create" as const,
			entityType: "user",
			entity: {
				data: userData,
			},
		}));

		await graphClient.batch(batchOperations);

		const batchEnd = Date.now();
		const batchTime = batchEnd - batchStart;

		console.log(`Batch operations took: ${batchTime}ms`);
		console.log(
			`Performance improvement: ${(individualTime / batchTime).toFixed(2)}x faster`,
		);
	} catch (error) {
		console.error("Performance comparison failed:", error);
	}
}

// Run examples
async function main() {
	await batchCreateExample();
	await batchUpdateExample();
	await mixedBatchOperations();
	await batchWithErrorHandling();
	await performanceComparison();
}

main().catch(console.error);
