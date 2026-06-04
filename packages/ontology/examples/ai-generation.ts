import { ontology } from "@frontal-labs/ontology";

/**
 * AI-powered model generation examples
 * Demonstrates how to use AI to generate and infer model schemas
 */
async function generateModelFromDescription() {
	console.log("Generating model from natural language description...");

	const description = `
    Create a blog post model for a content management system. 
    The model should include:
    - Title and content fields
    - Author information
    - Publication status (draft, published, archived)
    - SEO metadata including meta description and keywords
    - Categories and tags
    - Publication date and last updated timestamp
    - Comment count and view count
    - Featured image URL
    - Reading time estimate
  `;

	try {
		const result = await ontology.generation.generate(description, {
			context: {
				existingModels: ["user", "category"],
			},
			substrates: ["postgresql", "elasticsearch"],
		});

		console.log("✅ Model generated successfully!");
		console.log("📊 Confidence score:", result.confidence);
		console.log("💭 Reasoning:", result.reasoning);
		console.log("📄 Proposed model:");
		console.log(`  Name: ${result.proposal.name}`);
		console.log(`  Fields: ${Object.keys(result.proposal.fields).length}`);
		console.log(
			`  Relationships: ${Object.keys(result.proposal.relationships || {}).length}`,
		);

		// Display field details
		Object.entries(result.proposal.fields).forEach(([fieldName, field]) => {
			console.log(
				`    ${fieldName}: ${field.type}${field.required ? " (required)" : ""}`,
			);
		});

		return result;
	} catch (error) {
		console.error("❌ Failed to generate model:", error);
		throw error;
	}
}

/**
 * Generate e-commerce model
 */
async function generateEcommerceModel() {
	console.log("Generating e-commerce ontology...");

	const orderDescription = `
    Create an order model for an e-commerce platform.
    Must include: customer information, order items, shipping address,
    billing address, payment status, order status, total amount,
    discount codes, tax calculations, and tracking information.
  `;

	const orderItemDescription = `
    Create an order item model that links to products and orders.
    Must include: product reference, quantity, unit price, total price,
    discounts applied, and variant information.
  `;

	try {
		const [orderResult, orderItemResult] = await Promise.all([
			ontology.generation.generate(orderDescription, {
				substrates: ["postgresql"],
			}),
			ontology.generation.generate(orderItemDescription, {
				substrates: ["postgresql"],
			}),
		]);

		console.log("✅ E-commerce models generated:");
		console.log(`  🛒 Order model: ${orderResult.confidence} confidence`);
		console.log(
			`  📦 Order item model: ${orderItemResult.confidence} confidence`,
		);

		return { orderResult, orderItemResult };
	} catch (error) {
		console.error("❌ Failed to generate e-commerce models:", error);
		throw error;
	}
}

/**
 * Infer models from existing data
 */
async function inferModelsFromData() {
	console.log("Inferring models from existing data patterns...");

	try {
		const result = await ontology.generation.infer({
			substrates: ["postgresql", "mysql"],
			confidence: "medium",
			merge: true,
		});

		console.log("✅ Model inference completed!");
		console.log("📊 Proposals generated:", result.proposals.length);

		result.proposals.forEach((proposal, index) => {
			console.log(`  ${index + 1}. ${proposal.name || "Unnamed model"}`);
			console.log(`     Fields: ${proposal.fields?.length || 0}`);
			console.log(`     Confidence: ${proposal.confidence || "unknown"}`);
		});

		return result;
	} catch (error) {
		console.error("❌ Failed to infer models:", error);
		throw error;
	}
}

/**
 * Get and manage AI suggestions
 */
async function manageSuggestions() {
	console.log("Managing AI suggestions...");

	try {
		// Get pending suggestions
		const pendingSuggestions = await ontology.generation.suggestions({
			status: "pending",
		});

		console.log("📋 Pending suggestions:", pendingSuggestions.data.length);

		pendingSuggestions.data.forEach((suggestion, index) => {
			console.log(`  ${index + 1}. ${suggestion.title || "Untitled"}`);
			console.log(`     Type: ${suggestion.type}`);
			console.log(`     Created: ${suggestion.createdAt}`);
			if (suggestion.description) {
				console.log(`     Description: ${suggestion.description}`);
			}
		});

		// Get all suggestions
		const allSuggestions = await ontology.generation.suggestions();
		console.log("📊 Total suggestions:", allSuggestions.data.length);

		return { pendingSuggestions, allSuggestions };
	} catch (error) {
		console.error("❌ Failed to manage suggestions:", error);
		throw error;
	}
}

/**
 * Accept or reject suggestions
 */
async function processSuggestions() {
	console.log("Processing AI suggestions...");

	try {
		const suggestions = await ontology.generation.suggestions({
			status: "pending",
		});

		if (suggestions.data.length === 0) {
			console.log("ℹ️ No pending suggestions to process");
			return;
		}

		// Process first suggestion as an example
		const firstSuggestion = suggestions.data[0];

		// Accept the suggestion
		const acceptResult = await ontology.generation.acceptSuggestion(
			firstSuggestion.id,
		);
		console.log("✅ Suggestion accepted:", firstSuggestion.id);
		console.log("📄 Result:", acceptResult);

		// If there are more suggestions, reject one as an example
		if (suggestions.data.length > 1) {
			const secondSuggestion = suggestions.data[1];
			const rejectResult = await ontology.generation.rejectSuggestion(
				secondSuggestion.id,
				"Does not match current requirements",
			);
			console.log("❌ Suggestion rejected:", secondSuggestion.id);
			console.log("📄 Result:", rejectResult);
		}

		return { acceptResult, rejectResult };
	} catch (error) {
		console.error("❌ Failed to process suggestions:", error);
		throw error;
	}
}

/**
 * Generate model with specific substrates
 */
async function generateWithSubstrates() {
	console.log("Generating models with specific substrate configurations...");

	const analyticsDescription = `
    Create an analytics event model for tracking user interactions.
    Must include: event type, user ID, session ID, timestamp,
    event properties, device information, and geographic data.
  `;

	try {
		const result = await ontology.generation.generate(analyticsDescription, {
			substrates: ["clickhouse", "kafka", "redis"],
			context: {
				existingModels: ["user", "session"],
			},
		});

		console.log("✅ Analytics model generated with multi-substrate support");
		console.log("📊 Confidence:", result.confidence);

		if (result.proposal.substrates) {
			console.log("🔧 Substrate routing:");
			Object.entries(result.proposal.substrates).forEach(
				([type, substrate]) => {
					console.log(`  ${type}: ${substrate}`);
				},
			);
		}

		return result;
	} catch (error) {
		console.error("❌ Failed to generate multi-substrate model:", error);
		throw error;
	}
}

/**
 * Generate model with semantic metadata
 */
async function generateWithSemantics() {
	console.log("Generating model with semantic metadata...");

	const semanticDescription = `
    Create a document model for a knowledge management system.
    Must include: title, content, author, creation date, last modified,
    document type, tags, access level, and full-text search capabilities.
    The system should understand document relationships and importance.
  `;

	try {
		const result = await ontology.generation.generate(semanticDescription, {
			substrates: ["postgresql", "elasticsearch"],
		});

		console.log("✅ Document model generated with semantic understanding");

		if (result.proposal.semantics) {
			console.log("🧠 Semantic metadata:");
			console.log(
				`  Description: ${result.proposal.semantics.description || "None"}`,
			);
			console.log(
				`  Tags: ${result.proposal.semantics.tags?.join(", ") || "None"}`,
			);
			console.log(
				`  Critical fields: ${result.proposal.semantics.criticalFields?.join(", ") || "None"}`,
			);
			console.log(
				`  Significant events: ${result.proposal.semantics.significantEvents?.join(", ") || "None"}`,
			);
		}

		return result;
	} catch (error) {
		console.error("❌ Failed to generate semantic model:", error);
		throw error;
	}
}

// Run AI generation examples
async function runGenerationExamples() {
	console.log("🚀 Starting AI Generation Examples\n");

	try {
		await generateModelFromDescription();
		console.log("");

		await generateEcommerceModel();
		console.log("");

		await inferModelsFromData();
		console.log("");

		await manageSuggestions();
		console.log("");

		await processSuggestions();
		console.log("");

		await generateWithSubstrates();
		console.log("");

		await generateWithSemantics();
		console.log("");

		console.log("✅ All AI generation examples completed successfully!");
	} catch (error) {
		console.error("❌ AI generation examples failed:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	runGenerationExamples();
}

export {
	generateModelFromDescription,
	generateEcommerceModel,
	inferModelsFromData,
	manageSuggestions,
	processSuggestions,
	generateWithSubstrates,
	generateWithSemantics,
	runGenerationExamples,
};
