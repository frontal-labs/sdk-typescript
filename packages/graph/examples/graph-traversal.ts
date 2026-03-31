import { FrontalClient } from "@frontal/core";
import { createGraphClient } from "@frontal/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Graph traversal operations
async function graphTraversalExample() {
	console.log("=== Graph Traversal ===");

	try {
		// Create some sample entities
		const userEntities = graphClient.entities("user");
		const projectEntities = graphClient.entities("project");
		const companyEntities = graphClient.entities("company");

		// Create a company
		const company = await companyEntities.create({
			data: {
				name: "Tech Corp",
				industry: "technology",
				founded: 2015,
			},
		});

		// Create users
		const user1 = await userEntities.create({
			data: {
				name: "Alice Smith",
				role: "engineer",
				experience: 5,
			},
			linkedEntities: [
				{ id: company.id, type: "company", relation: "works_for" },
			],
		});

		const user2 = await userEntities.create({
			data: {
				name: "Bob Johnson",
				role: "manager",
				experience: 8,
			},
			linkedEntities: [
				{ id: company.id, type: "company", relation: "works_for" },
			],
		});

		// Create projects
		const project1 = await projectEntities.create({
			data: {
				name: "Mobile App",
				status: "active",
				budget: 100000,
			},
			linkedEntities: [
				{ id: user1.id, type: "user", relation: "assigned_to" },
				{ id: user2.id, type: "user", relation: "manages" },
			],
		});

		// Traverse from user to find all related entities
		const traversalResult = await graphClient.traverse({
			startEntity: { id: user1.id, type: "user" },
			direction: "outgoing",
			maxDepth: 3,
		});

		console.log("Traversal from user1:", traversalResult);
		console.log("Found paths:", traversalResult.totalFound);

		// Find shortest path between two users
		const pathResult = await graphClient.findPath({
			fromEntity: { id: user1.id, type: "user" },
			toEntity: { id: user2.id, type: "user" },
			algorithm: "shortest",
		});

		console.log("Shortest path between users:", pathResult.shortestPath);

		// Find all paths between users
		const allPathsResult = await graphClient.findPath({
			fromEntity: { id: user1.id, type: "user" },
			toEntity: { id: user2.id, type: "user" },
			algorithm: "all",
			maxPaths: 5,
		});

		console.log("All paths between users:", allPathsResult.paths);
	} catch (error) {
		console.error("Traversal operation failed:", error);
	}
}

// Example: Complex traversal with filters
async function filteredTraversal() {
	console.log("\n=== Filtered Traversal ===");

	try {
		// Traverse with filters
		const filteredResult = await graphClient.traverse({
			startEntity: { id: "user-123", type: "user" },
			direction: "both",
			maxDepth: 2,
			filters: {
				entityTypes: ["project", "company"],
				minWeight: 0.5,
				relationTypes: ["works_for", "assigned_to"],
			},
		});

		console.log("Filtered traversal results:", filteredResult);
	} catch (error) {
		console.error("Filtered traversal failed:", error);
	}
}

// Run examples
async function main() {
	await graphTraversalExample();
	await filteredTraversal();
}

main().catch(console.error);
