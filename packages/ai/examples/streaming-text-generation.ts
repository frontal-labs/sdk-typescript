/**
 * Streaming Text Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * for streaming text generation, which provides real-time
 * text output as it's being generated.
 */

import { AI } from "../src";

// Initialize the AI client
const ai = new AI();

async function streamingTextGeneration() {
	console.log("[START] Starting Streaming Text Generation Example\n");

	try {
		// Example 1: Basic streaming with onChunk callback
		console.log("[EXAMPLE] Example 1: Basic streaming with callback");
		const result1 = ai.streamText({
			model: "gpt-3.5-turbo",
			prompt: "Write a short story about a robot learning to paint.",
			maxTokens: 200,
			temperature: 0.8,
			onChunk: (chunk) => {
				process.stdout.write(chunk); // Write each chunk as it arrives
			},
		});

		// Wait for the stream to complete
		const usage1 = await result1.usage;
		console.log("\n\n[SUCCESS] Stream completed!");
		console.log("[USAGE] Usage:", usage1);

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Manual stream processing
		console.log("[EXAMPLE] Example 2: Manual stream processing");
		const result2 = ai.streamText({
			model: "gpt-3.5-turbo",
			prompt: "Explain quantum computing in simple terms.",
			maxTokens: 150,
			temperature: 0.5,
		});

		// Process the stream manually
		const reader = result2.textStream.getReader();
		const decoder = new TextDecoder();
		let fullText = "";

		console.log("🔄 Streaming response:");
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			fullText += chunk;
			process.stdout.write(chunk);
		}

		const usage2 = await result2.usage;
		console.log("\n\n[SUCCESS] Full text received!");
		console.log("[USAGE] Usage:", usage2);

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Streaming with conversation history
		console.log("[EXAMPLE] Example 3: Streaming with conversation history");
		const result3 = ai.streamText({
			model: "gpt-3.5-turbo",
			prompt: "",
			messages: [
				{ role: "system", content: "You are a creative writing assistant." },
				{
					role: "user",
					content: "Continue this story: The old lighthouse stood...",
				},
			],
			maxTokens: 100,
			temperature: 0.9,
			onChunk: (chunk) => {
				process.stdout.write(chunk);
			},
		});

		const usage3 = await result3.usage;
		console.log("\n\n[SUCCESS] Story continuation completed!");
		console.log("[USAGE] Usage:", usage3);

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: Error handling in streaming
		console.log("[EXAMPLE] Example 4: Error handling");
		try {
			const result4 = ai.streamText({
				model: "invalid-model-name",
				prompt: "This should fail.",
				onChunk: (chunk) => {
					console.log("Received chunk:", chunk);
				},
			});

			const reader4 = result4.textStream.getReader();
			try {
				await reader4.read();
			} catch (streamError) {
				console.log("❌ Stream error caught:", streamError.message);
			}
		} catch (error) {
			console.log("❌ Initialization error caught:", error);
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Utility function to demonstrate different streaming patterns
async function demonstrateStreamingPatterns() {
	console.log("🎯 Demonstrating Different Streaming Patterns\n");

	// Pattern 1: Real-time display
	console.log("📡 Pattern 1: Real-time display");
	const stream1 = ai.streamText({
		model: "gpt-3.5-turbo",
		prompt: "List 3 benefits of streaming responses.",
		onChunk: (chunk) => {
			// Display chunks as they arrive
			process.stdout.write(chunk);
		},
	});
	await stream1.usage;

	console.log("\n\n" + "─".repeat(30) + "\n");

	// Pattern 2: Buffer and process
	console.log("📦 Pattern 2: Buffer and process");
	const stream2 = ai.streamText({
		model: "gpt-3.5-turbo",
		prompt: "Write a haiku about programming.",
	});

	const reader = stream2.textStream.getReader();
	const chunks: string[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	const fullText = chunks.join("");
	console.log("Collected text:", fullText);
	console.log("Number of chunks:", chunks.length);
	console.log("Usage:", await stream2.usage);

	console.log("\n" + "─".repeat(30) + "\n");

	// Pattern 3: Transform on the fly
	console.log("🔄 Pattern 3: Transform on the fly");
	const stream3 = ai.streamText({
		model: "gpt-3.5-turbo",
		prompt: "Write a short sentence.",
		onChunk: (chunk) => {
			// Transform each chunk (e.g., convert to uppercase)
			const transformed = chunk.toUpperCase();
			process.stdout.write(transformed);
		},
	});
	await stream3.usage;
}

// Run the examples
if (import.meta.main) {
	await streamingTextGeneration();
	console.log("\n" + "=".repeat(60) + "\n");
	await demonstrateStreamingPatterns();
}

export { streamingTextGeneration, demonstrateStreamingPatterns };
