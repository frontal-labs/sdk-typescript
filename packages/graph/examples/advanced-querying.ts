import { FrontalClient } from "@frontal-labs/core";
import { createGraphClient } from "@frontal-labs/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Complex filtering and querying
async function complexFilteringExample() {
	console.log("=== Complex Filtering ===");

	try {
		// Query with multiple conditions
		const complexQuery = await graphClient.query({
			entityType: "user",
			conditions: {
				and: [
					{ age: { gte: 25 } },
					{ role: { in: ["developer", "designer", "manager"] } },
					{
						or: [
							{ department: { eq: "engineering" } },
							{ department: { eq: "product" } },
						],
					},
				],
			},
			orderBy: [
				{ field: "age", direction: "desc" },
				{ field: "name", direction: "asc" },
			],
			limit: 20,
			include: ["linkedEntities", "meta"],
		});

		console.log("Complex query results:", complexQuery);

		// Query with nested conditions
		const nestedQuery = await graphClient.query({
			entityType: "project",
			conditions: {
				"data.status": { eq: "active" },
				"data.budget": { gte: 50000 },
				"meta.createdBy": { exists: true },
			},
			orderBy: [{ field: "data.budget", direction: "desc" }],
			limit: 10,
		});

		console.log("Nested query results:", nestedQuery);
	} catch (error) {
		console.error("Complex filtering failed:", error);
	}
}

// Example: Pagination and cursor-based navigation
async function paginationExample() {
	console.log("\n=== Pagination ===");

	try {
		let allResults = [];
		let cursor = null;
		let pageCount = 0;

		do {
			const result = await graphClient.query({
				entityType: "user",
				conditions: {
					role: { eq: "developer" },
				},
				orderBy: [{ field: "createdAt", direction: "desc" }],
				limit: 10,
				cursor: cursor,
			});

			allResults = allResults.concat(result.data);
			cursor = result.nextCursor;
			pageCount++;

			console.log(`Page ${pageCount}: Found ${result.data.length} users`);
		} while (cursor && pageCount < 5); // Limit to 5 pages for example

		console.log(`Total users fetched: ${allResults.length}`);

		// Manual pagination with offset
		const page2 = await graphClient.query({
			entityType: "user",
			conditions: {
				department: { eq: "engineering" },
			},
			orderBy: [{ field: "name", direction: "asc" }],
			limit: 5,
			cursor: "page-2-offset", // This would be a proper cursor in real implementation
		});

		console.log("Page 2 results:", page2);
	} catch (error) {
		console.error("Pagination failed:", error);
	}
}

// Example: Field selection and projection
async function fieldSelectionExample() {
	console.log("\n=== Field Selection ===");

	try {
		// Select specific fields only
		const minimalFields = await graphClient.query({
			entityType: "user",
			include: ["id", "data.name", "data.email"],
			limit: 5,
		});

		console.log("Minimal fields result:", minimalFields);

		// Include related entities
		const withRelations = await graphClient.query({
			entityType: "user",
			conditions: {
				role: { eq: "manager" },
			},
			include: [
				"id",
				"data.name",
				"data.role",
				"linkedEntities",
				"meta.createdBy",
			],
			limit: 10,
		});

		console.log("With relations:", withRelations);

		// Exclude specific fields (if supported)
		const excludeFields = await graphClient.query({
			entityType: "user",
			conditions: {
				department: { eq: "engineering" },
			},
			// Note: This would depend on API support for field exclusion
			include: ["id", "data.name", "data.role"], // Only include needed fields
			limit: 5,
		});

		console.log("Selected fields only:", excludeFields);
	} catch (error) {
		console.error("Field selection failed:", error);
	}
}

// Example: Advanced sorting and ordering
async function advancedOrderingExample() {
	console.log("\n=== Advanced Ordering ===");

	try {
		// Multi-field sorting
		const multiSort = await graphClient.query({
			entityType: "user",
			orderBy: [
				{ field: "data.department", direction: "asc" },
				{ field: "data.salary", direction: "desc" },
				{ field: "data.name", direction: "asc" },
			],
			limit: 20,
		});

		console.log("Multi-field sorted results:", multiSort);

		// Sort by nested fields
		const nestedSort = await graphClient.query({
			entityType: "project",
			orderBy: [
				{ field: "data.budget", direction: "desc" },
				{ field: "meta.updatedAt", direction: "desc" },
			],
			limit: 10,
		});

		console.log("Nested field sorted results:", nestedSort);

		// Sort with null handling (if supported)
		const nullHandlingSort = await graphClient.query({
			entityType: "user",
			conditions: {
				role: { exists: true },
			},
			orderBy: [
				{ field: "data.salary", direction: "desc" },
				{ field: "data.bonus", direction: "desc" }, // Handle null bonuses
			],
			limit: 15,
		});

		console.log("Null handling sort:", nullHandlingSort);
	} catch (error) {
		console.error("Advanced ordering failed:", error);
	}
}

// Example: Aggregation and grouping (if supported)
async function aggregationExample() {
	console.log("\n=== Aggregation ===");

	try {
		// Count entities by type
		const userCount = await graphClient.query({
			entityType: "user",
			limit: 1, // We only need the count
		});

		console.log(
			"Total users available:",
			userCount.total || userCount.data.length,
		);

		// Group by department (conceptual - would need API support)
		const departments = ["engineering", "product", "design", "sales"];

		for (const dept of departments) {
			const deptUsers = await graphClient.query({
				entityType: "user",
				conditions: {
					department: { eq: dept },
				},
				limit: 1,
			});

			console.log(
				`Department ${dept}: ${deptUsers.total || deptUsers.data.length} users`,
			);
		}

		// Average salary by role (conceptual)
		const roles = ["developer", "designer", "manager", "analyst"];

		for (const role of roles) {
			const roleUsers = await graphClient.query({
				entityType: "user",
				conditions: {
					role: { eq: role },
				},
				include: ["data.salary"],
				limit: 100, // Get all for calculation
			});

			if (roleUsers.data.length > 0) {
				const salaries = roleUsers.data
					.map((user) => user.data.salary)
					.filter((salary) => typeof salary === "number");

				const avgSalary =
					salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length;
				console.log(`Average salary for ${role}: $${avgSalary.toFixed(2)}`);
			}
		}
	} catch (error) {
		console.error("Aggregation failed:", error);
	}
}

// Example: Search and text queries
async function searchExample() {
	console.log("\n=== Search Queries ===");

	try {
		// Text search in specific fields
		const nameSearch = await graphClient.query({
			entityType: "user",
			conditions: {
				"data.name": { contains: "John" },
			},
			limit: 10,
		});

		console.log("Users named John:", nameSearch);

		// Multiple field search
		const multiFieldSearch = await graphClient.query({
			entityType: "user",
			conditions: {
				or: [
					{ "data.name": { contains: "Alice" } },
					{ "data.email": { contains: "alice" } },
					{ "data.bio": { contains: "developer" } },
				],
			},
			limit: 10,
		});

		console.log("Multi-field search results:", multiFieldSearch);

		// Regex search (if supported)
		const regexSearch = await graphClient.query({
			entityType: "user",
			conditions: {
				"data.email": { matches: ".*@company\\.com$" }, // Ends with @company.com
			},
			limit: 20,
		});

		console.log("Company email users:", regexSearch);
	} catch (error) {
		console.error("Search queries failed:", error);
	}
}

// Example: Performance optimization
async function performanceOptimization() {
	console.log("\n=== Performance Optimization ===");

	try {
		console.time("Optimized query");

		// Use specific field selection
		const optimizedQuery = await graphClient.query({
			entityType: "user",
			conditions: {
				role: { eq: "developer" },
				department: { eq: "engineering" },
			},
			include: ["id", "data.name", "data.email"], // Only needed fields
			orderBy: [{ field: "data.name", direction: "asc" }],
			limit: 50,
		});

		console.timeEnd("Optimized query");
		console.log(
			`Optimized query returned ${optimizedQuery.data.length} results`,
		);

		// Compare with non-optimized query
		console.time("Non-optimized query");

		const nonOptimizedQuery = await graphClient.query({
			entityType: "user",
			// No field restrictions
			limit: 50,
		});

		console.timeEnd("Non-optimized query");
		console.log(
			`Non-optimized query returned ${nonOptimizedQuery.data.length} results`,
		);

		// Use indexed fields (if applicable)
		console.time("Indexed field query");

		const indexedQuery = await graphClient.query({
			entityType: "user",
			conditions: {
				id: { in: ["user-1", "user-2", "user-3"] }, // Assuming ID is indexed
			},
			limit: 10,
		});

		console.timeEnd("Indexed field query");
		console.log(`Indexed query returned ${indexedQuery.data.length} results`);
	} catch (error) {
		console.error("Performance optimization failed:", error);
	}
}

// Run examples
async function main() {
	await complexFilteringExample();
	await paginationExample();
	await fieldSelectionExample();
	await advancedOrderingExample();
	await aggregationExample();
	await searchExample();
	await performanceOptimization();
}

main().catch(console.error);
