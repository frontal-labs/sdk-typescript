import { ontology } from "@frontal/ontology";

/**
 * Business rules management examples
 * Demonstrates creating and managing validation rules for models
 */
async function createBusinessRules() {
	console.log("Creating business rules...");

	// Email validation rule
	const emailRule = {
		name: "valid-email-format",
		description: "Ensures email addresses follow proper format",
		entityTypes: ["user"],
		condition: "email.matches(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)",
		action: "validate" as const,
		severity: "error" as const,
		enabled: true,
	};

	// Age validation rule
	const ageRule = {
		name: "user-age-restriction",
		description: "Users must be at least 13 years old",
		entityTypes: ["user"],
		condition: "age >= 13",
		action: "validate" as const,
		severity: "error" as const,
		enabled: true,
	};

	// Product price validation rule
	const priceRule = {
		name: "positive-product-price",
		description: "Product prices must be positive",
		entityTypes: ["product"],
		condition: "price > 0",
		action: "validate" as const,
		severity: "error" as const,
		enabled: true,
	};

	// Data quality warning rule
	const dataQualityRule = {
		name: "complete-user-profile",
		description: "Encourage users to complete their profile",
		entityTypes: ["user"],
		condition: "firstName && lastName && email",
		action: "notify" as const,
		severity: "warning" as const,
		enabled: true,
	};

	try {
		const rules = await Promise.all([
			ontology.rules.create(emailRule),
			ontology.rules.create(ageRule),
			ontology.rules.create(priceRule),
			ontology.rules.create(dataQualityRule),
		]);

		console.log("✅ Business rules created:", rules.length);
		rules.forEach((rule, index) => {
			console.log(`  ${index + 1}. ${rule.name} (${rule.action})`);
		});

		return rules;
	} catch (error) {
		console.error("❌ Failed to create business rules:", error);
		throw error;
	}
}

/**
 * List and manage rules
 */
async function manageRules() {
	console.log("Managing business rules...");

	try {
		// List all rules
		const rules = await ontology.rules.list();
		console.log("📋 Total rules:", rules.data.length);

		rules.data.forEach((rule, index) => {
			console.log(`  ${index + 1}. ${rule.name}`);
			console.log(`     Entity: ${rule.entityTypes.join(", ")}`);
			console.log(`     Action: ${rule.action}`);
			console.log(`     Severity: ${rule.severity}`);
			console.log(`     Enabled: ${rule.enabled}`);
		});

		// Update a rule
		if (rules.data.length > 0) {
			const firstRule = rules.data[0];
			const updatedRule = await ontology.rules.update(firstRule.name, {
				enabled: false,
			});
			console.log(
				"✅ Rule updated:",
				updatedRule.name,
				"enabled:",
				updatedRule.enabled,
			);
		}

		return rules;
	} catch (error) {
		console.error("❌ Failed to manage rules:", error);
		throw error;
	}
}

/**
 * Evaluate rules against data
 */
async function evaluateRules() {
	console.log("Evaluating business rules...");

	try {
		// Evaluate all rules
		const evaluation = await ontology.rules.evaluate({
			sample: 100, // Sample 100 records
		});

		console.log("📊 Rule evaluation results:");
		console.log(`  Total evaluated: ${evaluation.results.length}`);
		console.log(`  Summary: ${JSON.stringify(evaluation.summary, null, 2)}`);

		// Evaluate specific entity type
		const userEvaluation = await ontology.rules.evaluate({
			entityType: "user",
			sample: 50,
		});

		console.log("👤 User-specific evaluation:");
		console.log(`  Results: ${userEvaluation.results.length}`);

		return { evaluation, userEvaluation };
	} catch (error) {
		console.error("❌ Failed to evaluate rules:", error);
		throw error;
	}
}

/**
 * Create mixins for reusable model components
 */
async function createMixins() {
	console.log("Creating model mixins...");

	// Timestamp mixin
	const timestampMixin = {
		name: "timestamps",
		description: "Adds createdAt and updatedAt fields to models",
		fields: {
			createdAt: {
				type: "timestamp" as const,
				required: true,
				auto: true,
			},
			updatedAt: {
				type: "timestamp" as const,
				required: true,
				auto: true,
			},
		},
		appliesTo: ["user", "product", "company", "order"],
	};

	// Soft delete mixin
	const softDeleteMixin = {
		name: "soft-delete",
		description: "Adds soft deletion capability",
		fields: {
			deletedAt: {
				type: "timestamp" as const,
				required: false,
			},
			isDeleted: {
				type: "boolean" as const,
				required: true,
				default: false,
			},
		},
		appliesTo: ["user", "product", "order"],
	};

	// Audit trail mixin
	const auditMixin = {
		name: "audit-trail",
		description: "Adds audit trail fields",
		fields: {
			createdBy: {
				type: "uuid" as const,
				required: false,
			},
			updatedBy: {
				type: "uuid" as const,
				required: false,
			},
			version: {
				type: "integer" as const,
				required: true,
				default: 1,
			},
		},
		appliesTo: ["user", "product", "company"],
	};

	try {
		const mixins = await Promise.all([
			ontology.mixins.create(timestampMixin),
			ontology.mixins.create(softDeleteMixin),
			ontology.mixins.create(auditMixin),
		]);

		console.log("✅ Mixins created:", mixins.length);
		mixins.forEach((mixin, index) => {
			console.log(`  ${index + 1}. ${mixin.name}`);
			console.log(`     Fields: ${Object.keys(mixin.fields).length}`);
			console.log(`     Applies to: ${mixin.appliesTo?.join(", ")}`);
		});

		return mixins;
	} catch (error) {
		console.error("❌ Failed to create mixins:", error);
		throw error;
	}
}

/**
 * List available mixins
 */
async function listMixins() {
	console.log("Listing available mixins...");

	try {
		const mixins = await ontology.mixins.list();
		console.log("📋 Available mixins:", mixins.data.length);

		mixins.data.forEach((mixin, index) => {
			console.log(`  ${index + 1}. ${mixin.name}`);
			console.log(`     Description: ${mixin.description}`);
			console.log(`     Fields: ${Object.keys(mixin.fields).join(", ")}`);
			if (mixin.appliesTo) {
				console.log(`     Applies to: ${mixin.appliesTo.join(", ")}`);
			}
		});

		return mixins;
	} catch (error) {
		console.error("❌ Failed to list mixins:", error);
		throw error;
	}
}

/**
 * Advanced rule with complex conditions
 */
async function advancedRules() {
	console.log("Creating advanced business rules...");

	// Complex product rule
	const productInventoryRule = {
		name: "product-inventory-check",
		description: "Product must have sufficient inventory for pricing tier",
		entityTypes: ["product"],
		condition: "price > 100 ? inventory > 10 : inventory > 0",
		action: "validate" as const,
		severity: "error" as const,
		enabled: true,
	};

	// User activity rule
	const userActivityRule = {
		name: "user-activity-requirement",
		description: "Premium users must have recent activity",
		entityTypes: ["user"],
		condition:
			'subscriptionTier === "premium" ? lastLoginAt > now() - 30days : true',
		action: "validate" as const,
		severity: "warning" as const,
		enabled: true,
	};

	// Data transformation rule
	const dataTransformRule = {
		name: "normalize-email",
		description: "Normalize email addresses to lowercase",
		entityTypes: ["user"],
		condition: "email",
		action: "transform" as const,
		severity: "info" as const,
		enabled: true,
	};

	try {
		const rules = await Promise.all([
			ontology.rules.create(productInventoryRule),
			ontology.rules.create(userActivityRule),
			ontology.rules.create(dataTransformRule),
		]);

		console.log("✅ Advanced rules created:", rules.length);

		// Evaluate specific rules
		const ruleEvaluation = await ontology.rules.evaluate({
			ruleIds: rules.map((rule) => rule.name),
			sample: 25,
		});

		console.log(
			"📊 Advanced rule evaluation:",
			ruleEvaluation.results.length,
			"results",
		);

		return { rules, ruleEvaluation };
	} catch (error) {
		console.error("❌ Failed to create advanced rules:", error);
		throw error;
	}
}

// Run rules and mixins examples
async function runRulesExamples() {
	console.log("🚀 Starting Rules and Mixins Examples\n");

	try {
		await createBusinessRules();
		console.log("");

		await manageRules();
		console.log("");

		await evaluateRules();
		console.log("");

		await createMixins();
		console.log("");

		await listMixins();
		console.log("");

		await advancedRules();
		console.log("");

		console.log("✅ All rules and mixins examples completed successfully!");
	} catch (error) {
		console.error("❌ Rules and mixins examples failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	runRulesExamples();
}

export {
	createBusinessRules,
	manageRules,
	evaluateRules,
	createMixins,
	listMixins,
	advancedRules,
	runRulesExamples,
};
