import { ontology } from "@frontal/ontology";

/**
 * Migration planning and execution examples
 * Demonstrates how to handle schema changes safely
 */
async function migrationPlanning() {
	console.log("Planning model migrations...");

	// Define a new version of the user model with additional fields
	const updatedUserDefinition = {
		name: "user",
		displayName: "User",
		description: "Enhanced user model with profile and preferences",
		fields: {
			id: {
				type: "uuid" as const,
				required: true,
				primary: true,
			},
			email: {
				type: "string" as const,
				required: true,
				unique: true,
			},
			username: {
				type: "string" as const,
				required: true,
				unique: true,
			},
			firstName: {
				type: "string" as const,
				required: true,
			},
			lastName: {
				type: "string" as const,
				required: true,
			},
			age: {
				type: "integer" as const,
				required: false,
			},
			isActive: {
				type: "boolean" as const,
				required: true,
				default: true,
			},
			profile: {
				type: "json" as const,
				required: false,
			},
			tags: {
				type: "array" as const,
				required: false,
				items: "string",
			},
			// New fields for migration
			avatar: {
				type: "string" as const,
				required: false,
				description: "URL to user avatar image",
			},
			timezone: {
				type: "string" as const,
				required: false,
				default: "UTC",
			},
			lastLoginAt: {
				type: "timestamp" as const,
				required: false,
			},
		},
		status: "active" as const,
	};

	try {
		// Plan the migration
		const plan = await ontology.migrations.plan({
			changes: [updatedUserDefinition],
		});

		console.log("📋 Migration plan created:", plan.id);
		console.log("📊 Risk level:", plan.riskLevel);
		console.log("🔄 Changes:", plan.changes.length);

		plan.changes.forEach((change, index) => {
			console.log(`  ${index + 1}. ${change.type}: ${change.description}`);
			console.log(`     Impact: ${change.impact}`);
		});

		return plan;
	} catch (error) {
		console.error("❌ Failed to plan migration:", error);
		throw error;
	}
}

/**
 * Apply migration with zero-downtime strategy
 */
async function applyMigration(planId: string) {
	console.log("Applying migration...");

	try {
		const result = await ontology.migrations.apply(planId, "zero-downtime");
		console.log("✅ Migration applied successfully:", result.id);
		console.log("📅 Applied at:", result.appliedAt);
		console.log("📊 Status:", result.status);

		return result;
	} catch (error) {
		console.error("❌ Failed to apply migration:", error);
		throw error;
	}
}

/**
 * Rollback a migration
 */
async function rollbackMigration(migrationId: string) {
	console.log("Rolling back migration...");

	try {
		const result = await ontology.migrations.rollback(migrationId);
		console.log("✅ Migration rolled back:", result.id);
		console.log("📅 Rolled back at:", result.rolledBackAt);
		console.log("📊 Status:", result.status);

		return result;
	} catch (error) {
		console.error("❌ Failed to rollback migration:", error);
		throw error;
	}
}

/**
 * View migration history
 */
async function migrationHistory() {
	console.log("Fetching migration history...");

	try {
		const history = await ontology.migrations.history({ limit: 10 });
		console.log("📚 Migration history:", history.data.length, "entries");

		history.data.forEach((entry, index) => {
			console.log(
				`  ${index + 1}. ${entry.modelId}: v${entry.fromVersion} → v${entry.toVersion}`,
			);
			console.log(`     Status: ${entry.status}`);
			console.log(`     Created: ${entry.createdAt}`);
		});

		return history;
	} catch (error) {
		console.error("❌ Failed to fetch migration history:", error);
		throw error;
	}
}

/**
 * Complex migration with relationships
 */
async function complexMigration() {
	console.log("Planning complex migration with relationships...");

	// Add address relationship to user model
	const addressDefinition = {
		name: "address",
		displayName: "Address",
		description: "User address information",
		fields: {
			id: {
				type: "uuid" as const,
				required: true,
				primary: true,
			},
			userId: {
				type: "uuid" as const,
				required: true,
			},
			street: {
				type: "string" as const,
				required: true,
			},
			city: {
				type: "string" as const,
				required: true,
			},
			state: {
				type: "string" as const,
				required: false,
			},
			zipCode: {
				type: "string" as const,
				required: true,
			},
			country: {
				type: "string" as const,
				required: true,
				default: "US",
			},
			isPrimary: {
				type: "boolean" as const,
				required: true,
				default: false,
			},
		},
		relationships: {
			user: {
				type: "belongsTo" as const,
				targetEntity: "user",
				foreignKey: "userId",
			},
		},
		indexes: [
			{
				name: "idx_address_user",
				fields: ["userId"],
			},
			{
				name: "idx_address_primary",
				fields: ["userId", "isPrimary"],
			},
		],
		status: "draft" as const,
	};

	// Update user model to include address relationship
	const userWithAddress = {
		name: "user",
		displayName: "User",
		description: "User model with address relationships",
		fields: {
			id: {
				type: "uuid" as const,
				required: true,
				primary: true,
			},
			email: {
				type: "string" as const,
				required: true,
				unique: true,
			},
			username: {
				type: "string" as const,
				required: true,
				unique: true,
			},
			firstName: {
				type: "string" as const,
				required: true,
			},
			lastName: {
				type: "string" as const,
				required: true,
			},
			isActive: {
				type: "boolean" as const,
				required: true,
				default: true,
			},
		},
		relationships: {
			addresses: {
				type: "hasMany" as const,
				targetEntity: "address",
			},
		},
		status: "active" as const,
	};

	try {
		// Create address model first
		const addressModel = await ontology.create(addressDefinition);
		console.log("✅ Address model created:", addressModel.id);

		// Plan migration for user model
		const plan = await ontology.migrations.plan({
			changes: [userWithAddress],
		});

		console.log("📋 Complex migration plan created:", plan.id);
		console.log("🔄 Changes:", plan.changes.length);

		return { addressModel, plan };
	} catch (error) {
		console.error("❌ Failed to create complex migration:", error);
		throw error;
	}
}

/**
 * Check system integrity
 */
async function checkIntegrity() {
	console.log("Checking model system integrity...");

	try {
		const integrity = await ontology.checkIntegrity();

		if (integrity.valid) {
			console.log("✅ System integrity check passed");
		} else {
			console.log("❌ System integrity violations found:");
			integrity.violations?.forEach((violation, index) => {
				console.log(`  ${index + 1}. ${violation.type}: ${violation.message}`);
			});
		}

		return integrity;
	} catch (error) {
		console.error("❌ Failed to check integrity:", error);
		throw error;
	}
}

// Run migration examples
async function runMigrationExamples() {
	console.log("🚀 Starting Migration Examples\n");

	try {
		await checkIntegrity();
		console.log("");

		const _plan = await migrationPlanning();
		console.log("");

		await migrationHistory();
		console.log("");

		await complexMigration();
		console.log("");

		console.log("✅ All migration examples completed successfully!");
	} catch (error) {
		console.error("❌ Migration examples failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	runMigrationExamples();
}

export {
	migrationPlanning,
	applyMigration,
	rollbackMigration,
	migrationHistory,
	complexMigration,
	checkIntegrity,
	runMigrationExamples,
};
