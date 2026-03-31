import { ontology } from "@frontal/ontology";

/**
 * Basic model creation example
 * Demonstrates creating a simple user model with common field types
 */
async function basicModelCreation() {
	console.log("Creating a basic User model...");

	const userDefinition = {
		name: "user",
		displayName: "User",
		description: "Core user entity for authentication and profile management",
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
		},
		status: "draft" as const,
	};

	try {
		const model = await ontology.create(userDefinition);
		console.log("✅ User model created successfully:", model.id);
		return model;
	} catch (error) {
		console.error("❌ Failed to create User model:", error);
		throw error;
	}
}

/**
 * Advanced model with relationships and substrates
 */
async function advancedModelCreation() {
	console.log("Creating advanced models with relationships...");

	// Create Company model first
	const companyDefinition = {
		name: "company",
		displayName: "Company",
		description: "Organization entity for B2B applications",
		fields: {
			id: {
				type: "uuid" as const,
				required: true,
				primary: true,
			},
			name: {
				type: "string" as const,
				required: true,
			},
			domain: {
				type: "string" as const,
				required: true,
				unique: true,
			},
			employeeCount: {
				type: "integer" as const,
				required: false,
			},
			revenue: {
				type: "currency" as const,
				required: false,
			},
			metadata: {
				type: "json" as const,
				required: false,
			},
		},
		substrates: {
			operational: "postgresql",
			analytical: "clickhouse",
			cache: "redis",
		},
		indexes: [
			{
				name: "idx_company_domain",
				fields: ["domain"],
				unique: true,
			},
		],
		status: "draft" as const,
	};

	// Create Product model with relationships
	const productDefinition = {
		name: "product",
		displayName: "Product",
		description: "Product catalog entity",
		fields: {
			id: {
				type: "uuid" as const,
				required: true,
				primary: true,
			},
			name: {
				type: "string" as const,
				required: true,
			},
			description: {
				type: "text" as const,
				required: false,
			},
			price: {
				type: "currency" as const,
				required: true,
			},
			category: {
				type: "enum" as const,
				required: true,
				enum: ["electronics", "clothing", "books", "home", "sports"],
			},
			inStock: {
				type: "boolean" as const,
				required: true,
				default: true,
			},
			companyId: {
				type: "uuid" as const,
				required: true,
			},
		},
		relationships: {
			company: {
				type: "belongsTo" as const,
				targetEntity: "company",
				foreignKey: "companyId",
			},
		},
		substrates: {
			operational: "postgresql",
			semantic: "elasticsearch",
		},
		semantics: {
			description: "Product catalog with search capabilities",
			tags: ["catalog", "ecommerce", "search"],
		},
		status: "draft" as const,
	};

	try {
		const company = await ontology.create(companyDefinition);
		console.log("✅ Company model created:", company.id);

		const product = await ontology.create(productDefinition);
		console.log("✅ Product model created:", product.id);

		return { company, product };
	} catch (error) {
		console.error("❌ Failed to create advanced models:", error);
		throw error;
	}
}

/**
 * Model validation example
 */
async function modelValidation() {
	console.log("Validating model definitions...");

	const invalidDefinition = {
		name: "invalid-model",
		fields: {
			// Missing required 'type' field
			invalidField: {
				required: true,
			},
		},
	};

	try {
		const result = await ontology.validate(invalidDefinition);
		if (result.valid) {
			console.log("✅ Model validation passed");
		} else {
			console.log("❌ Model validation failed:", result.errors);
		}
		return result;
	} catch (error) {
		console.error("❌ Validation error:", error);
		throw error;
	}
}

/**
 * List and filter models
 */
async function listModels() {
	console.log("Listing available ontology...");

	try {
		// List all models
		const allModels = await ontology.list();
		console.log("📋 All models:", allModels.data.length);

		// List only active models
		const activeModels = await ontology.list({ status: "active" });
		console.log("📋 Active models:", activeModels.data.length);

		// List models with pagination
		const paginatedModels = await ontology.list({ limit: 5 });
		console.log("📋 First 5 models:", paginatedModels.data.length);

		return { allModels, activeModels, paginatedModels };
	} catch (error) {
		console.error("❌ Failed to list models:", error);
		throw error;
	}
}

/**
 * Model operations example
 */
async function modelOperations() {
	console.log("Performing model operations...");

	const modelName = "user";

	try {
		// Get model details
		const model = await ontology.model(modelName).get();
		console.log("📄 Model details:", model.name, `v${model.version}`);

		// Update model
		const updatedModel = await ontology.model(modelName).update({
			description: "Updated user model with additional fields",
		});
		console.log("✅ Model updated:", updatedModel.updatedAt);

		// Get model versions
		const versions = await ontology.model(modelName).versions();
		console.log("📚 Model versions:", versions.data.length);

		// Validate existing data
		const validation = await ontology.model(modelName).validateData();
		console.log(
			"🔍 Data validation:",
			validation.totalChecked,
			"records checked",
		);

		return { model, updatedModel, versions, validation };
	} catch (error) {
		console.error("❌ Model operations failed:", error);
		throw error;
	}
}

// Run all examples
async function runExamples() {
	console.log("🚀 Starting Models SDK Examples\n");

	try {
		await basicModelCreation();
		console.log("");

		await advancedModelCreation();
		console.log("");

		await modelValidation();
		console.log("");

		await listModels();
		console.log("");

		await modelOperations();
		console.log("");

		console.log("✅ All examples completed successfully!");
	} catch (error) {
		console.error("❌ Examples failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	runExamples();
}

export {
	basicModelCreation,
	advancedModelCreation,
	modelValidation,
	listModels,
	modelOperations,
	runExamples,
};
