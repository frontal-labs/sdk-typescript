/**
 * Structured Object Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to generate structured JSON objects using Zod schemas,
 * ensuring type-safe and validated output.
 */

import { AI } from "../src";
import { z } from "zod";

// Initialize the AI client
const ai = new AI();

// Define some example schemas
const PersonSchema = z.object({
	name: z.string(),
	age: z.number().min(0).max(150),
	email: z.string().email(),
	hobbies: z.array(z.string()),
});

const ProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	price: z.number().positive(),
	category: z.enum(["electronics", "clothing", "books", "home"]),
	inStock: z.boolean(),
	tags: z.array(z.string()),
});

const RecipeSchema = z.object({
	title: z.string(),
	prepTime: z.number(), // in minutes
	cookTime: z.number(), // in minutes
	servings: z.number().positive(),
	ingredients: z.array(
		z.object({
			name: z.string(),
			amount: z.string(),
			unit: z.string(),
		}),
	),
	instructions: z.array(z.string()),
	difficulty: z.enum(["easy", "medium", "hard"]),
});

async function structuredObjectGeneration() {
	console.log("🚀 Starting Structured Object Generation Example\n");

	try {
		// Example 1: Generate a person object
		console.log("📝 Example 1: Generate a person object");
		const result1 = await ai.generateObject({
			model: "gpt-3.5-turbo",
			prompt: "Generate a fictional person with realistic details.",
			schema: PersonSchema,
			temperature: 0.7,
		});

		if (result1.error) {
			console.error("❌ Error:", result1.error.message);
		} else {
			console.log("✅ Generated person:");
			console.log(JSON.stringify(result1.data.object, null, 2));
			console.log("📊 Usage:", result1.data.usage);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Generate a product
		console.log("📝 Example 2: Generate a product");
		const result2 = await ai.generateObject({
			model: "gpt-3.5-turbo",
			prompt: "Create a product for an online electronics store.",
			schema: ProductSchema,
			temperature: 0.5,
		});

		if (result2.error) {
			console.error("❌ Error:", result2.error.message);
		} else {
			console.log("✅ Generated product:");
			console.log(JSON.stringify(result2.data.object, null, 2));
			console.log("📊 Usage:", result2.data.usage);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Generate a recipe
		console.log("📝 Example 3: Generate a recipe");
		const result3 = await ai.generateObject({
			model: "gpt-3.5-turbo",
			prompt: "Create a simple pasta recipe with ingredients and instructions.",
			schema: RecipeSchema,
			temperature: 0.6,
		});

		if (result3.error) {
			console.error("❌ Error:", result3.error.message);
		} else {
			console.log("✅ Generated recipe:");
			console.log(JSON.stringify(result3.data.object, null, 2));
			console.log("📊 Usage:", result3.data.usage);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: Generate with retry mechanism
		console.log("📝 Example 4: Generate with retry mechanism");
		const result4 = await ai.generateObject({
			model: "gpt-3.5-turbo",
			prompt: "Generate complex nested data that might need retries.",
			schema: z.object({
				company: z.object({
					name: z.string(),
					founded: z.number(),
					employees: z.array(
						z.object({
							name: z.string(),
							role: z.string(),
							department: z.string(),
						}),
					),
				}),
			}),
			temperature: 0.8,
			maxRetries: 3,
		});

		if (result4.error) {
			console.error("❌ Error:", result4.error.message);
		} else {
			console.log("✅ Generated complex object:");
			console.log(JSON.stringify(result4.data.object, null, 2));
			console.log("📊 Usage:", result4.data.usage);
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Dynamic schema generation
async function dynamicSchemaExample() {
	console.log("🎯 Advanced Example: Dynamic Schema Generation\n");

	// Generate a schema based on user requirements
	const userRequirement =
		"I need to track customer feedback with ratings, comments, and categories.";

	const SchemaDefinitionSchema = z.object({
		name: z.string(),
		fields: z.array(
			z.object({
				name: z.string(),
				type: z.enum(["string", "number", "boolean", "array"]),
				required: z.boolean(),
				description: z.string(),
			}),
		),
	});

	const schemaResult = await ai.generateObject({
		model: "gpt-3.5-turbo",
		prompt: `Based on this requirement: "${userRequirement}", generate a JSON schema definition.`,
		schema: SchemaDefinitionSchema,
		temperature: 0.3,
	});

	if (schemaResult.error) {
		console.error("❌ Error generating schema:", schemaResult.error.message);
		return;
	}

	console.log("✅ Generated schema definition:");
	console.log(JSON.stringify(schemaResult.data.object, null, 2));

	// Now use the generated schema to create actual data
	const sampleDataResult = await ai.generateObject({
		model: "gpt-3.5-turbo",
		prompt: "Generate sample customer feedback data based on the schema.",
		schema: z.record(z.any()), // Use a flexible schema since we don't know the exact structure
		temperature: 0.7,
	});

	if (sampleDataResult.error) {
		console.error(
			"❌ Error generating sample data:",
			sampleDataResult.error.message,
		);
	} else {
		console.log("\n✅ Generated sample data:");
		console.log(JSON.stringify(sampleDataResult.data.object, null, 2));
	}
}

// Example: Data extraction and transformation
async function dataExtractionExample() {
	console.log("🎯 Example: Data Extraction and Transformation\n");

	const unstructuredText = `
    Customer Order #12345
    --------------------
    Customer: John Smith
    Email: john.smith@email.com
    Phone: (555) 123-4567
    
    Items:
    - Laptop Pro 15" - $1,299.99
    - Wireless Mouse - $29.99
    - USB-C Hub - $49.99
    
    Shipping Address:
    123 Main Street
    Anytown, ST 12345
    
    Order Date: 2024-01-15
    Status: Processing
  `;

	const OrderSchema = z.object({
		orderId: z.string(),
		customer: z.object({
			name: z.string(),
			email: z.string().email(),
			phone: z.string(),
		}),
		items: z.array(
			z.object({
				name: z.string(),
				price: z.number(),
			}),
		),
		shippingAddress: z.object({
			street: z.string(),
			city: z.string(),
			state: z.string(),
			zipCode: z.string(),
		}),
		orderDate: z.string(),
		status: z.string(),
		total: z.number(),
	});

	const result = await ai.generateObject({
		model: "gpt-3.5-turbo",
		prompt: `Extract the order information from this unstructured text and convert it to a structured object: ${unstructuredText}`,
		schema: OrderSchema,
		temperature: 0.2,
	});

	if (result.error) {
		console.error("❌ Error:", result.error.message);
	} else {
		console.log("✅ Extracted order data:");
		console.log(JSON.stringify(result.data.object, null, 2));
		console.log("📊 Usage:", result.data.usage);
	}
}

// Example: Validation with custom error handling
async function validationExample() {
	console.log("🎯 Example: Validation with Custom Error Handling\n");

	// Define a strict schema
	const StrictUserSchema = z.object({
		username: z.string().min(3).max(20),
		email: z.string().email(),
		age: z.number().min(13).max(120),
		preferences: z.object({
			theme: z.enum(["light", "dark"]),
			notifications: z.boolean(),
		}),
	});

	console.log("🔄 Attempting to generate with strict validation...");

	const result = await ai.generateObject({
		model: "gpt-3.5-turbo",
		prompt:
			"Generate a user profile that might not always meet the strict validation requirements.",
		schema: StrictUserSchema,
		temperature: 0.9,
		maxRetries: 2,
	});

	if (result.error) {
		console.log("❌ Failed after retries:", result.error.message);
		console.log("This demonstrates the retry mechanism when validation fails.");
	} else {
		console.log("✅ Generated valid user profile:");
		console.log(JSON.stringify(result.data.object, null, 2));
	}
}

// Run the examples
if (import.meta.main) {
	await structuredObjectGeneration();
	console.log("\n" + "=".repeat(60) + "\n");
	await dynamicSchemaExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await dataExtractionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await validationExample();
}

export {
	structuredObjectGeneration,
	dynamicSchemaExample,
	dataExtractionExample,
	validationExample,
};
