import { FrontalClient } from "@frontal/core";
import { createGraphClient } from "@frontal/graph";

// Initialize client
const client = new FrontalClient({
	apiKey: process.env.FRONTAL_API_KEY,
	baseUrl: process.env.FRONTAL_BASE_URL,
});

const graphClient = createGraphClient(client);

// Example: Time travel queries
async function timeTravelExample() {
	console.log("=== Time Travel Queries ===");

	try {
		const userEntities = graphClient.entities("user");

		// Create a user
		const user = await userEntities.create({
			data: {
				name: "Jane Doe",
				email: "jane@example.com",
				role: "developer",
				salary: 75000,
			},
		});

		console.log("Initial user:", user);

		// Wait a moment (in real scenario, this would be actual time passing)
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Update user multiple times
		await userEntities.update(user.id, {
			role: "senior-developer",
			salary: 90000,
		});

		await new Promise((resolve) => setTimeout(resolve, 1000));

		await userEntities.update(user.id, {
			role: "tech-lead",
			salary: 110000,
		});

		// Query user at different points in time
		const _currentTime = new Date().toISOString();
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

		// Get current version
		const currentUser = await userEntities.get(user.id);
		console.log("Current user:", currentUser);

		// Get user from 5 minutes ago (should return initial version)
		const historicalUser = await userEntities.get(user.id, {
			at: fiveMinutesAgo,
		});
		console.log("User from 5 minutes ago:", historicalUser);

		// Query with time travel
		const historicalQuery = await graphClient.query({
			entityType: "user",
			conditions: {
				id: { eq: user.id },
			},
			at: fiveMinutesAgo,
		});

		console.log("Historical query results:", historicalQuery);
	} catch (error) {
		console.error("Time travel query failed:", error);
	}
}

// Example: Entity history tracking
async function entityHistoryExample() {
	console.log("\n=== Entity History ===");

	try {
		const userEntities = graphClient.entities("user");

		// Create a user
		const user = await userEntities.create({
			data: {
				name: "John Smith",
				department: "engineering",
				level: "junior",
			},
		});

		// Make several updates with reasons
		await userEntities.update(user.id, {
			level: "mid-level",
			projects: ["project-a"],
		});

		await userEntities.update(user.id, {
			level: "senior",
			projects: ["project-a", "project-b"],
			mentor: "jane.doe@company.com",
		});

		await userEntities.update(user.id, {
			department: "engineering-leadership",
			level: "principal",
		});

		// Get entity history
		const history = await graphClient.history.get(user.id, "user");
		console.log("Entity history:", history);

		// Display change history
		history.history.forEach((change, _index) => {
			console.log(`\nVersion ${change.version}:`);
			console.log(`  Changed by: ${change.changedBy}`);
			console.log(`  Changed at: ${change.changedAt}`);
			console.log(`  Reason: ${change.reason || "No reason provided"}`);

			change.changes.forEach((fieldChange) => {
				console.log(
					`  ${fieldChange.field}: ${fieldChange.from} → ${fieldChange.to}`,
				);
			});
		});
	} catch (error) {
		console.error("Entity history failed:", error);
	}
}

// Example: Version-specific operations
async function versionSpecificOperations() {
	console.log("\n=== Version-Specific Operations ===");

	try {
		const userEntities = graphClient.entities("user");

		// Create and update a user
		const user = await userEntities.create({
			data: {
				name: "Alice Johnson",
				skills: ["javascript", "typescript"],
				experience: 3,
			},
		});

		const _updatedUser = await userEntities.update(user.id, {
			skills: ["javascript", "typescript", "react"],
			experience: 4,
		});

		// Get specific version
		const version1 = await userEntities.get(user.id, { version: 1 });
		const version2 = await userEntities.get(user.id, { version: 2 });

		console.log("Version 1:", version1);
		console.log("Version 2:", version2);

		// Query entities at specific version
		const versionQuery = await graphClient.query({
			entityType: "user",
			conditions: {
				id: { eq: user.id },
			},
			at: version1.createdAt, // Use the timestamp from version 1
		});

		console.log("Query at version 1 time:", versionQuery);
	} catch (error) {
		console.error("Version-specific operations failed:", error);
	}
}

// Example: Audit trail and compliance
async function auditTrailExample() {
	console.log("\n=== Audit Trail ===");

	try {
		const documentEntities = graphClient.entities("document");

		// Create a document
		const document = await documentEntities.create({
			data: {
				title: "Q4 Financial Report",
				content: "Initial draft...",
				status: "draft",
				classification: "internal",
			},
		});

		// Simulate review process
		await documentEntities.update(document.id, {
			status: "review",
			reviewedBy: "manager@company.com",
		});

		await documentEntities.update(document.id, {
			status: "approved",
			content: "Updated content after review...",
			approvedBy: "director@company.com",
			classification: "confidential",
		});

		// Get complete audit trail
		const auditTrail = await graphClient.history.get(document.id, "document");

		console.log("Document audit trail:");
		auditTrail.history.forEach((entry, index) => {
			console.log(`\n--- Change ${index + 1} ---`);
			console.log(`Timestamp: ${entry.changedAt}`);
			console.log(`Changed by: ${entry.changedBy}`);
			console.log(`Version: ${entry.version}`);

			entry.changes.forEach((change) => {
				console.log(
					`Field ${change.field}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`,
				);
			});
		});

		// Query document at different stages
		const draftVersion = await documentEntities.get(document.id, {
			at: auditTrail.history[0].changedAt,
		});

		const approvedVersion = await documentEntities.get(document.id, {
			at: auditTrail.history[2].changedAt,
		});

		console.log("\nDraft version:", draftVersion.data.status);
		console.log("Approved version:", approvedVersion.data.status);
	} catch (error) {
		console.error("Audit trail example failed:", error);
	}
}

// Run examples
async function main() {
	await timeTravelExample();
	await entityHistoryExample();
	await versionSpecificOperations();
	await auditTrailExample();
}

main().catch(console.error);
