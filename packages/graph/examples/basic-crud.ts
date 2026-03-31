import { FrontalClient } from "@frontal/core";
import { createGraphClient, graph } from "@frontal/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Basic CRUD operations with entities
async function basicEntityCRUD() {
	console.log("=== Basic Entity CRUD ===");

	try {
		// Create a user entity
		const userEntities = graphClient.entities("user");

		const newUser = await userEntities.create({
			data: {
				name: "John Doe",
				email: "john@example.com",
				age: 30,
				role: "developer",
			},
		});

		console.log("Created user:", newUser);

		// Read the user
		const retrievedUser = await userEntities.get(newUser.id);
		console.log("Retrieved user:", retrievedUser);

		// Update the user
		const updatedUser = await userEntities.update(newUser.id, {
			age: 31,
			role: "senior-developer",
		});
		console.log("Updated user:", updatedUser);

		// List all users
		const users = await userEntities.list({
			limit: 10,
			orderBy: [{ field: "createdAt", direction: "desc" }],
		});
		console.log("All users:", users);

		// Delete the user
		await userEntities.delete(newUser.id);
		console.log("User deleted successfully");
	} catch (error) {
		console.error("CRUD operation failed:", error);
	}
}

// Example: Using the default graph client
async function defaultClientExample() {
	console.log("\n=== Default Client Example ===");

	try {
		// This uses environment variables automatically
		const userEntities = graph.entities("user");

		const users = await userEntities.list({
			conditions: {
				age: { gte: 25 },
			},
			limit: 5,
		});

		console.log("Users aged 25+:", users);
	} catch (error) {
		console.error("Default client operation failed:", error);
	}
}

// Run examples
async function main() {
	await basicEntityCRUD();
	await defaultClientExample();
}

main().catch(console.error);
