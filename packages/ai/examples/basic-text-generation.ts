/**
 * Basic Text Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * for simple text generation using large language models.
 */

import { AI } from "../src";

// Initialize the AI client
// It will automatically use environment variables for configuration
const ai = new AI();

async function basicTextGeneration() {
	console.log("[START] Starting Basic Text Generation Example\n");

	try {
		// Simple text generation with a prompt
		console.log("[EXAMPLE] Example 1: Simple text generation");
		const result1 = await ai.generateText({
			model: "gpt-3.5-turbo",
			prompt: "Write a short poem about artificial intelligence.",
			maxTokens: 100,
			temperature: 0.7,
		});

		if (result1.error) {
			console.error("[ERROR] Error:", result1.error.message);
		} else {
			console.log("[SUCCESS] Generated text:", result1.data.text);
			console.log("[USAGE] Usage:", result1.data.usage);
			console.log("[FINISH] Finish reason:", result1.data.finishReason);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Text generation with conversation history
		console.log("[EXAMPLE] Example 2: Conversation with history");
		const result2 = await ai.generateText({
			model: "gpt-3.5-turbo",
			prompt: "", // Empty prompt when using messages
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: "What is the capital of France?" },
				{ role: "assistant", content: "The capital of France is Paris." },
				{ role: "user", content: "What is its population?" },
			],
			temperature: 0.3,
		});

		if (result2.error) {
			console.error("[ERROR] Error:", result2.error.message);
		} else {
			console.log("[SUCCESS] Response:", result2.data.text);
			console.log("[USAGE] Usage:", result2.data.usage);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Text generation with custom parameters
		console.log("[EXAMPLE] Example 3: Custom parameters");
		const result3 = await ai.generateText({
			model: "gpt-3.5-turbo",
			prompt: "Generate a list of 5 programming languages.",
			maxTokens: 150,
			temperature: 0.9,
			topP: 0.9,
			frequencyPenalty: 0.5,
			presencePenalty: 0.5,
			stopSequences: ["6.", "6)"],
		});

		if (result3.error) {
			console.error("[ERROR] Error:", result3.error.message);
		} else {
			console.log("[SUCCESS] Generated list:", result3.data.text);
			console.log("[USAGE] Usage:", result3.data.usage);
		}
	} catch (error) {
		console.error("[ERROR] Unexpected error:", error);
	}
}

// Run the example
if (import.meta.main) {
	basicTextGeneration();
}

export { basicTextGeneration };
