/**
 * Comprehensive Usage Example
 *
 * This example demonstrates how to use multiple features of the Frontal AI SDK
 * together in a real-world application scenario.
 */

import { z } from "zod";
import { ai } from "../src";

// Initialize the AI client

async function comprehensiveUsageExample() {
	console.log("🚀 Starting Comprehensive Usage Example\n");

	try {
		// Scenario: Building an AI-powered content analysis and generation system
		console.log("📋 Scenario: AI Content Analysis and Generation System");

		// Step 1: Analyze user input with moderation
		console.log("\n🔍 Step 1: Content moderation analysis");
		const userInput =
			"I'm working on a machine learning project and need help with neural networks. Can you explain backpropagation?";

		const moderationResult = await ai.moderate({
			input: userInput,
		});

		if (moderationResult.error) {
			console.error("❌ Moderation failed:", moderationResult.error.message);
			return;
		}

		const isSafe = !moderationResult.data.results[0].flagged;
		console.log(`✅ Content analysis: ${isSafe ? "Safe" : "Flagged"}`);

		if (!isSafe) {
			console.log("⚠️ Content flagged, stopping processing");
			return;
		}

		// Step 2: Generate embedding for semantic search
		console.log("\n🔍 Step 2: Generate embedding for semantic search");
		const embeddingResult = await ai.embed({
			model: "text-embedding-ada-002",
			input: userInput,
		});

		if (embeddingResult.error) {
			console.error(
				"❌ Embedding generation failed:",
				embeddingResult.error.message,
			);
			return;
		}

		console.log("✅ Embedding generated");
		console.log(
			"📏 Embedding dimensions:",
			embeddingResult.data.embeddings[0].length,
		);

		// Step 3: Generate structured response using object generation
		console.log("\n🤖 Step 3: Generate structured response");

		const ResponseSchema = z.object({
			explanation: z.string(),
			complexity: z.enum(["beginner", "intermediate", "advanced"]),
			topics: z.array(z.string()),
			codeExample: z.string().optional(),
			furtherReading: z.array(z.string()),
		});

		const structuredResult = await ai.generateObject({
			model: "gpt-3.5-turbo",
			prompt: `Analyze this question about machine learning and provide a structured response: ${userInput}`,
			schema: ResponseSchema,
			temperature: 0.3,
		});

		if (structuredResult.error) {
			console.error(
				"❌ Structured generation failed:",
				structuredResult.error.message,
			);
			return;
		}

		const responseData = structuredResult.data.object;
		console.log("✅ Structured response generated");
		console.log("📊 Complexity:", responseData.complexity);
		console.log("🏷️ Topics:", responseData.topics.join(", "));

		// Step 4: Generate detailed explanation with streaming
		console.log("\n📝 Step 4: Generate detailed explanation with streaming");

		const streamResult = ai.streamText({
			model: "gpt-3.5-turbo",
			prompt: `Provide a detailed explanation about backpropagation in neural networks, suitable for someone with ${responseData.complexity} knowledge level.`,
			maxTokens: 500,
			temperature: 0.5,
			onChunk: (chunk) => {
				process.stdout.write(chunk);
			},
		});

		console.log("🔄 Streaming detailed explanation:");
		await streamResult.usage;
		console.log("\n✅ Streaming completed");

		// Step 5: Generate speech from the explanation
		console.log("\n🔊 Step 5: Generate speech from explanation");

		const speechResult = await ai.generateSpeech({
			text: `Backpropagation is ${responseData.complexity} level concept. Key topics include ${responseData.topics.join(", ")}.`,
			voice: "nova",
			model: "tts-1",
			speed: 1.0,
		});

		if (speechResult.error) {
			console.error("❌ Speech generation failed:", speechResult.error.message);
		} else {
			console.log("✅ Speech generated");
			console.log("📏 Audio size:", speechResult.data.byteLength, "bytes");
		}

		// Step 6: Generate related image
		console.log("\n🎨 Step 6: Generate related illustration");

		const imageResult = await ai.generateImage({
			prompt:
				"Neural network backpropagation diagram, educational style, clean illustration",
			model: "dall-e-3",
			size: "1024x1024",
			quality: "hd",
			style: "natural",
			n: 1,
		});

		if (imageResult.error) {
			console.error("❌ Image generation failed:", imageResult.error.message);
		} else {
			console.log("✅ Illustration generated");
			if (imageResult.data.images[0].url) {
				console.log("🔗 Image URL:", imageResult.data.images[0].url);
			}
		}

		// Step 7: Create and use custom tools
		console.log("\n🛠️ Step 7: Create and use custom tools");

		const mathTool = ai.defineTool({
			name: "calculate_learning_metrics",
			description: "Calculate learning metrics for neural networks",
			parameters: z.object({
				epochs: z.number(),
				accuracy: z.number(),
				loss: z.number(),
			}),
			execute: async (params) => {
				const { epochs, accuracy, loss } = params;

				return {
					epochs,
					accuracy,
					loss,
					convergence: loss < 0.01 ? "converged" : "training",
					efficiency: accuracy / epochs,
					recommendation:
						accuracy > 0.95
							? "Model ready for deployment"
							: "Continue training",
				};
			},
		});

		ai.registerTool(mathTool);
		console.log("✅ Math tool registered");

		// Use the tool
		const toolResult = await ai.executeTool("calculate_learning_metrics", {
			epochs: 100,
			accuracy: 0.96,
			loss: 0.008,
		});

		if (toolResult.error) {
			console.error("❌ Tool execution failed:", toolResult.error.message);
		} else {
			console.log("✅ Tool executed successfully");
			console.log("📊 Metrics:", JSON.stringify(toolResult.data, null, 2));
		}

		// Step 8: Create and manage prompts
		console.log("\n📋 Step 8: Create and manage prompts");

		const _analysisPrompt = ai.createPrompt({
			name: "ml-concept-analysis",
			template: `
Analyze this machine learning concept: {concept}
Level: {level}
Include: {includeTopics}
Language: {language}
      `.trim(),
			variables: {
				concept: { type: "string", description: "ML concept to analyze" },
				level: { type: "string", description: "Knowledge level" },
				includeTopics: {
					type: "boolean",
					description: "Include related topics",
				},
				language: { type: "string", description: "Output language" },
			},
			metadata: {
				category: "education",
				version: "1.0.0",
			},
		});

		console.log("✅ Analysis prompt created");

		const retrievedPrompt = ai.getPrompt("ml-concept-analysis");
		if (retrievedPrompt.error) {
			console.error(
				"❌ Prompt retrieval failed:",
				retrievedPrompt.error.message,
			);
		} else {
			console.log("✅ Prompt retrieved successfully");

			// Use the prompt with streaming
			const promptStreamResult = ai.streamText({
				model: "gpt-3.5-turbo",
				prompt: retrievedPrompt.data.template
					.replace("{concept}", "gradient descent")
					.replace("{level}", "intermediate")
					.replace("{includeTopics}", "true")
					.replace("{language}", "English"),
				maxTokens: 300,
				onChunk: (chunk) => {
					process.stdout.write(chunk);
				},
			});

			console.log("\n🔄 Using prompt for gradient descent:");
			await promptStreamResult.usage;
			console.log("\n✅ Prompt-based streaming completed");
		}

		// Step 9: List available models
		console.log("\n🤖 Step 9: List available models");

		const modelsResult = await ai.listModels();
		if (modelsResult.error) {
			console.error("❌ Failed to list models:", modelsResult.error.message);
		} else {
			console.log("✅ Available models:");
			modelsResult.data.forEach((model, index) => {
				console.log(`   ${index + 1}. ${model}`);
			});
		}

		// Step 10: Token counting and cost estimation
		console.log("\n💰 Step 10: Token counting and cost estimation");

		const sampleText =
			"This is a sample text for token counting and cost estimation.";
		const tokens = ai.countTokens(sampleText);
		console.log("📏 Token count:", tokens);

		const estimatedCost = ai.estimateCost({
			model: "gpt-3.5-turbo",
			inputTokens: tokens,
			outputTokens: 50, // Estimated output
		});
		console.log("💰 Estimated cost:", `$${estimatedCost.toFixed(6)}`);

		console.log(`\n${"=".repeat(60)}`);
		console.log("🎉 Comprehensive usage example completed successfully!");
		console.log("🎯 Demonstrated features:");
		console.log("   ✅ Content moderation");
		console.log("   ✅ Text embedding");
		console.log("   ✅ Structured object generation");
		console.log("   ✅ Streaming text generation");
		console.log("   ✅ Speech generation");
		console.log("   ✅ Image generation");
		console.log("   ✅ Custom tool creation and usage");
		console.log("   ✅ Prompt management");
		console.log("   ✅ Model listing");
		console.log("   ✅ Token counting and cost estimation");
	} catch (error) {
		console.error("❌ Unexpected error in comprehensive example:", error);
	}
}

// Advanced scenario: Multi-modal AI assistant
async function multiModalAssistantExample() {
	console.log("\n🎯 Advanced Scenario: Multi-modal AI Assistant\n");

	// Simulate a conversation with multiple AI capabilities
	const conversation = [
		{
			user: "Can you explain quantum computing and create a simple diagram?",
			capabilities: ["text", "image"],
		},
		{
			user: "Now explain it in audio form for accessibility",
			capabilities: ["speech"],
		},
		{
			user: "Can you analyze this explanation for safety?",
			capabilities: ["moderation"],
		},
	];

	for (let i = 0; i < conversation.length; i++) {
		const turn = conversation[i];
		console.log(`\n👤 User Turn ${i + 1}: ${turn.user}`);
		console.log(`🛠️ Required capabilities: ${turn.capabilities.join(", ")}`);

		// Text generation
		if (turn.capabilities.includes("text")) {
			const textResult = await ai.generateText({
				model: "gpt-3.5-turbo",
				prompt: turn.user,
				maxTokens: 200,
				temperature: 0.5,
			});

			if (!textResult.error) {
				console.log(
					`🤖 AI Response: ${textResult.data.text.substring(0, 100)}...`,
				);
			}
		}

		// Image generation
		if (turn.capabilities.includes("image")) {
			const imageResult = await ai.generateImage({
				prompt:
					"Simple quantum computing diagram, educational style, minimal design",
				model: "dall-e-3",
				size: "512x512",
				n: 1,
			});

			if (!imageResult.error) {
				console.log("🎨 Generated diagram for visualization");
			}
		}

		// Speech generation
		if (turn.capabilities.includes("speech")) {
			// First get the text explanation
			const textResult = await ai.generateText({
				model: "gpt-3.5-turbo",
				prompt: "Explain quantum computing in simple terms for audio format",
				maxTokens: 100,
				temperature: 0.3,
			});

			if (!textResult.error) {
				const speechResult = await ai.generateSpeech({
					text: textResult.data.text,
					voice: "alloy",
					model: "tts-1",
				});

				if (!speechResult.error) {
					console.log("🔊 Generated audio explanation");
				}
			}
		}

		// Moderation
		if (turn.capabilities.includes("moderation")) {
			// Get the previous AI response for moderation
			const previousResponse =
				"Quantum computing uses quantum mechanics principles to process information in fundamentally new ways.";

			const moderationResult = await ai.moderate({
				input: previousResponse,
			});

			if (!moderationResult.error) {
				const isSafe = !moderationResult.data.results[0].flagged;
				console.log(
					`🛡️ Content safety check: ${isSafe ? "Safe" : "Needs review"}`,
				);
			}
		}
	}
}

// Performance and optimization example
async function performanceExample() {
	console.log("\n⚡ Performance and Optimization Example\n");

	// Test different models for performance
	const models = ["gpt-3.5-turbo", "gpt-4"];
	const testPrompt =
		"Explain the concept of machine learning in one paragraph.";

	console.log("🏃‍♂️ Testing model performance:");

	for (const model of models) {
		console.log(`\n🤖 Testing ${model}:`);

		const startTime = Date.now();

		const result = await ai.generateText({
			model: model,
			prompt: testPrompt,
			maxTokens: 100,
			temperature: 0.3,
		});

		const endTime = Date.now();
		const duration = endTime - startTime;

		if (!result.error) {
			console.log(`   ⏱️ Response time: ${duration}ms`);
			console.log(`   📊 Tokens used: ${result.data.usage.totalTokens}`);
			console.log(`   📝 Response length: ${result.data.text.length} chars`);
			console.log(
				`   ⚡ Tokens/second: ${(result.data.usage.totalTokens / (duration / 1000)).toFixed(2)}`,
			);
		}
	}

	// Test streaming vs non-streaming performance
	console.log("\n🔄 Streaming vs Non-streaming comparison:");

	// Non-streaming
	const nonStreamStart = Date.now();
	const nonStreamResult = await ai.generateText({
		model: "gpt-3.5-turbo",
		prompt: testPrompt,
		maxTokens: 200,
	});
	const nonStreamEnd = Date.now();

	// Streaming
	const streamStart = Date.now();
	const streamResult = ai.streamText({
		model: "gpt-3.5-turbo",
		prompt: testPrompt,
		maxTokens: 200,
	});
	await streamResult.usage;
	const streamEnd = Date.now();

	console.log(`📊 Non-streaming: ${nonStreamEnd - nonStreamStart}ms`);
	console.log(`📊 Streaming: ${streamEnd - streamStart}ms`);

	if (!nonStreamResult.error) {
		console.log(
			`📏 Non-streaming tokens: ${nonStreamResult.data.usage.totalTokens}`,
		);
	}
}

// Run the examples
if (import.meta.main) {
	await comprehensiveUsageExample();
	console.log(`\n${"=".repeat(80)}\n`);
	await multiModalAssistantExample();
	console.log(`\n${"=".repeat(80)}\n`);
	await performanceExample();
}

export {
	comprehensiveUsageExample,
	multiModalAssistantExample,
	performanceExample,
};
