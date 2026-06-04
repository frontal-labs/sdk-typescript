import { ontology } from "@frontal-labs/ontology";

/**
 * Complete workflow example demonstrating end-to-end model management
 * This example shows how to build a complete blog platform schema
 */
async function buildBlogPlatform() {
	console.log("🚀 Building complete blog platform schema...");

	try {
		// Step 1: Generate base models using AI
		console.log("📝 Step 1: Generating base ontology...");

		const userDescription =
			"Create a user model with authentication, profile, and roles";
		const userResult = await ontology.generation.generate(userDescription);
		console.log(
			`✅ User model generated (${userResult.confidence} confidence)`,
		);

		// Step 2: Create the user model
		const userModel = await ontology.create(userResult.proposal);
		console.log("✅ User model created:", userModel.id);

		// Step 3: Generate blog post model
		const postDescription = `
      Create a blog post model with title, content, author, publication status,
      SEO metadata, categories, tags, and engagement metrics
    `;
		const postResult = await ontology.generation.generate(postDescription, {
			context: { existingModels: ["user"] },
			substrates: ["postgresql", "elasticsearch"],
		});
		console.log(
			`✅ Blog post model generated (${postResult.confidence} confidence)`,
		);

		// Step 4: Create the blog post model
		const postModel = await ontology.create(postResult.proposal);
		console.log("✅ Blog post model created:", postModel.id);

		// Step 5: Add business rules
		console.log("📋 Step 5: Adding business rules...");

		const contentRules = [
			{
				name: "post-title-required",
				description: "Blog posts must have a title",
				entityTypes: ["blog-post"],
				condition: "title && title.length > 0",
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
			{
				name: "post-content-minimum",
				description: "Blog posts must have at least 100 characters",
				entityTypes: ["blog-post"],
				condition: "content && content.length >= 100",
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
			{
				name: "author-verification",
				description: "Published posts must have a valid author",
				entityTypes: ["blog-post"],
				condition:
					'status === "published" ? authorId && authorId.length > 0 : true',
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
		];

		const createdRules = await Promise.all(
			contentRules.map((rule) => ontology.rules.create(rule)),
		);
		console.log(`✅ ${createdRules.length} business rules created`);

		// Step 6: Create mixins for reusable functionality
		console.log("🔧 Step 6: Creating mixins...");

		const auditMixin = {
			name: "blog-audit",
			description: "Audit trail for blog entities",
			fields: {
				createdAt: { type: "timestamp" as const, required: true, auto: true },
				updatedAt: { type: "timestamp" as const, required: true, auto: true },
				createdBy: { type: "uuid" as const, required: false },
				updatedBy: { type: "uuid" as const, required: false },
				version: { type: "integer" as const, required: true, default: 1 },
			},
			appliesTo: ["user", "blog-post"],
		};

		const seoMixin = {
			name: "seo-metadata",
			description: "SEO metadata for content",
			fields: {
				metaTitle: { type: "string" as const, required: false },
				metaDescription: { type: "text" as const, required: false },
				metaKeywords: {
					type: "array" as const,
					required: false,
					items: "string",
				},
				ogImage: { type: "string" as const, required: false },
				canonicalUrl: { type: "string" as const, required: false },
			},
			appliesTo: ["blog-post"],
		};

		const [auditMixinResult, seoMixinResult] = await Promise.all([
			ontology.mixins.create(auditMixin),
			ontology.mixins.create(seoMixin),
		]);
		console.log("✅ Audit and SEO mixins created");

		// Step 7: Plan and apply migrations
		console.log("🔄 Step 7: Planning migrations...");

		const migrationPlan = await ontology.migrations.plan({
			changes: [userResult.proposal, postResult.proposal],
		});

		console.log(`📋 Migration plan created (${migrationPlan.riskLevel} risk)`);
		console.log(`📊 Changes: ${migrationPlan.changes.length}`);

		// Apply migration (in production, this would be carefully reviewed)
		const migrationResult = await ontology.migrations.apply(
			migrationPlan.id,
			"zero-downtime",
		);
		console.log("✅ Migration applied successfully");

		// Step 8: Validate the setup
		console.log("✅ Step 8: Validating setup...");

		const integrity = await ontology.checkIntegrity();
		if (integrity.valid) {
			console.log("✅ System integrity check passed");
		} else {
			console.log("⚠️ System integrity issues found");
		}

		// Step 9: Test rule evaluation
		console.log("🧪 Step 9: Testing rule evaluation...");

		const ruleEvaluation = await ontology.rules.evaluate({
			entityType: "blog-post",
			sample: 10,
		});

		console.log(`📊 Rule evaluation: ${ruleEvaluation.results.length} results`);
		console.log(`📈 Summary: ${JSON.stringify(ruleEvaluation.summary)}`);

		return {
			userModel,
			postModel,
			rules: createdRules,
			mixins: [auditMixinResult, seoMixinResult],
			migration: migrationResult,
			integrity,
			ruleEvaluation,
		};
	} catch (error) {
		console.error("❌ Failed to build blog platform:", error);
		throw error;
	}
}

/**
 * E-commerce platform workflow
 */
async function buildEcommercePlatform() {
	console.log("🛒 Building e-commerce platform schema...");

	try {
		// Generate core e-commerce models
		const modelsToGenerate = [
			{
				name: "product",
				description: "Product catalog with pricing, inventory, and categories",
				substrates: ["postgresql", "elasticsearch"],
			},
			{
				name: "customer",
				description: "Customer profile with orders, addresses, and preferences",
				substrates: ["postgresql"],
			},
			{
				name: "order",
				description: "Order management with items, payments, and shipping",
				substrates: ["postgresql"],
			},
		];

		const generatedModels = await Promise.all(
			modelsToGenerate.map(async (modelSpec) => {
				const result = await ontology.generation.generate(
					modelSpec.description,
					{
						substrates: modelSpec.substrates,
					},
				);
				return { name: modelSpec.name, result };
			}),
		);

		console.log(`✅ Generated ${generatedModels.length} e-commerce models`);

		// Create all models
		const createdModels = await Promise.all(
			generatedModels.map(({ result }) => ontology.create(result.proposal)),
		);

		console.log(`✅ Created ${createdModels.length} models`);

		// Create e-commerce specific rules
		const ecommerceRules = [
			{
				name: "product-price-validation",
				description: "Product prices must be positive",
				entityTypes: ["product"],
				condition: "price > 0",
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
			{
				name: "inventory-check",
				description: "Products must have sufficient inventory",
				entityTypes: ["product"],
				condition: "inventory >= 0",
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
			{
				name: "order-total-calculation",
				description: "Order total must match sum of items",
				entityTypes: ["order"],
				condition:
					"totalAmount === items.reduce((sum, item) => sum + item.totalPrice, 0)",
				action: "validate" as const,
				severity: "error" as const,
				enabled: true,
			},
		];

		const rules = await Promise.all(
			ecommerceRules.map((rule) => ontology.rules.create(rule)),
		);

		console.log(`✅ Created ${rules.length} e-commerce rules`);

		return { models: createdModels, rules };
	} catch (error) {
		console.error("❌ Failed to build e-commerce platform:", error);
		throw error;
	}
}

/**
 * Analytics platform workflow
 */
async function buildAnalyticsPlatform() {
	console.log("📊 Building analytics platform schema...");

	try {
		// Generate analytics models
		const eventModelDescription = `
      Create an analytics event model for tracking user interactions.
      Must support high-volume ingestion, real-time processing, and
      complex aggregations. Include event type, user ID, session ID,
      timestamp, properties, device info, and geographic data.
    `;

		const eventResult = await ontology.generation.generate(
			eventModelDescription,
			{
				substrates: ["clickhouse", "kafka", "redis"],
			},
		);

		console.log(
			`✅ Analytics event model generated (${eventResult.confidence} confidence)`,
		);

		// Create the model
		const eventModel = await ontology.create(eventResult.proposal);
		console.log("✅ Analytics event model created");

		// Create analytics-specific mixins
		const analyticsMixin = {
			name: "analytics-timestamps",
			description: "Timestamp fields for analytics",
			fields: {
				eventTime: { type: "timestamp" as const, required: true },
				processedTime: { type: "timestamp" as const, required: false },
				partitionDate: { type: "string" as const, required: false },
			},
			appliesTo: ["analytics-event"],
		};

		const mixinResult = await ontology.mixins.create(analyticsMixin);
		console.log("✅ Analytics mixin created");

		return { eventModel, mixin: mixinResult };
	} catch (error) {
		console.error("❌ Failed to build analytics platform:", error);
		throw error;
	}
}

/**
 * Model relationship management workflow
 */
async function manageModelRelationships() {
	console.log("🔗 Managing model relationships...");

	try {
		// Get existing models
		const existingModels = await ontology.list({ limit: 10 });
		console.log(`📋 Found ${existingModels.data.length} existing models`);

		if (existingModels.data.length < 2) {
			console.log("ℹ️ Need at least 2 models to demonstrate relationships");
			return;
		}

		const model1 = existingModels.data[0];
		const model2 = existingModels.data[1];

		console.log(`🔗 Working with models: ${model1.name} and ${model2.name}`);

		// Add relationship from model1 to model2
		const relationshipDefinition = {
			type: "hasMany" as const,
			targetEntity: model2.name,
			description: `Relationship from ${model1.name} to ${model2.name}`,
		};

		const addedRelationship = await ontology
			.model(model1.name)
			.addRelationship(relationshipDefinition);
		console.log("✅ Relationship added successfully");

		// Get all relationships for the model
		const relationships = await ontology.model(model1.name).relationships();
		console.log(
			`📊 Model ${model1.name} has ${relationships.data.length} relationships`,
		);

		return { model1, model2, relationship: addedRelationship, relationships };
	} catch (error) {
		console.error("❌ Failed to manage relationships:", error);
		throw error;
	}
}

// Run all workflow examples
async function runWorkflowExamples() {
	console.log("🚀 Starting Complete Workflow Examples\n");

	try {
		await buildBlogPlatform();
		console.log("");

		await buildEcommercePlatform();
		console.log("");

		await buildAnalyticsPlatform();
		console.log("");

		await manageModelRelationships();
		console.log("");

		console.log("✅ All workflow examples completed successfully!");
	} catch (error) {
		console.error("❌ Workflow examples failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	runWorkflowExamples();
}

export {
	buildBlogPlatform,
	buildEcommercePlatform,
	buildAnalyticsPlatform,
	manageModelRelationships,
	runWorkflowExamples,
};
