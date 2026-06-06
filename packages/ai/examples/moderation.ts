/**
 * Content Moderation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to moderate content and detect potentially harmful or inappropriate material.
 */

import { ai } from "../src";

// Initialize the AI client

async function moderationExample() {
	console.log("🚀 Starting Content Moderation Example\n");

	try {
		// Example 1: Basic text moderation
		console.log("📝 Example 1: Basic text moderation");
		const result1 = await ai.moderate({
			input:
				"This is a harmless, positive message about technology and innovation.",
		});

		if (result1.error) {
			console.error("❌ Error:", result1.error.message);
		} else {
			console.log("✅ Moderation completed!");
			console.log("📊 Results:", JSON.stringify(result1.data, null, 2));

			const flagged = result1.data.results[0].flagged;
			console.log(`🚩 Flagged: ${flagged ? "Yes" : "No"}`);

			if (flagged) {
				console.log("⚠️ Categories flagged:");
				const categories = result1.data.results[0].categories;
				Object.entries(categories).forEach(([category, isFlagged]) => {
					if (isFlagged) {
						console.log(`   - ${category}`);
					}
				});
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Multiple texts moderation
		console.log("📝 Example 2: Multiple texts moderation");
		const texts = [
			"I love programming and building software!",
			"This content might be inappropriate for some audiences.",
			"Let's discuss machine learning algorithms.",
			"Some potentially harmful content here.",
		];

		const result2 = await ai.moderate({
			input: texts,
		});

		if (result2.error) {
			console.error("❌ Error:", result2.error.message);
		} else {
			console.log("✅ Batch moderation completed!");
			result2.data.results.forEach((result, index) => {
				console.log(`\nText ${index + 1}: "${texts[index]}"`);
				console.log(`   Flagged: ${result.flagged ? "Yes" : "No"}`);

				if (result.flagged) {
					console.log("   Flagged categories:");
					Object.entries(result.categories).forEach(([category, isFlagged]) => {
						if (isFlagged) {
							console.log(`     - ${category}`);
						}
					});
				}
			});
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Content category analysis
		console.log("📝 Example 3: Content category analysis");
		const testContent = [
			"I'm feeling sad and want to hurt myself.",
			"Here's how to build a bomb for illegal purposes.",
			"Let's have a respectful debate about politics.",
			"Check out this amazing new restaurant!",
			"I hate people who are different from me.",
		];

		for (let i = 0; i < testContent.length; i++) {
			const content = testContent[i];
			console.log(`\n🔍 Analyzing: "${content}"`);

			const result = await ai.moderate({
				input: content,
			});

			if (result.error) {
				console.error(`❌ Error:`, result.error.message);
			} else {
				const moderationResult = result.data.results[0];
				console.log(`   Flagged: ${moderationResult.flagged ? "Yes" : "No"}`);

				// Show category scores
				console.log("   Category scores:");
				Object.entries(moderationResult.category_scores).forEach(
					([category, score]) => {
						console.log(`     - ${category}: ${(score * 100).toFixed(2)}%`);
					},
				);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Different moderation models
		console.log("📝 Example 4: Different moderation models");
		const models = ["text-moderation-latest", "text-moderation-stable"];

		for (const model of models) {
			console.log(`\n🤖 Using model: ${model}`);

			const result = await ai.moderate({
				input: "Test content for moderation analysis.",
				model: model,
			});

			if (result.error) {
				console.error(`❌ Error with ${model}:`, result.error.message);
			} else {
				console.log(`   Model used: ${result.data.model}`);
				console.log(
					`   Flagged: ${result.data.results[0].flagged ? "Yes" : "No"}`,
				);
			}
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Real-time content filtering
async function realTimeFilteringExample() {
	console.log("🎯 Advanced Example: Real-time Content Filtering\n");

	console.log("🔄 Simulating real-time content moderation:");
	console.log("   - User comments in a chat system");
	console.log("   - Filter inappropriate content before display");
	console.log("   - Provide feedback to users");

	const userComments = [
		{ userId: 1, username: "alice", comment: "Great discussion everyone!" },
		{ userId: 2, username: "bob", comment: "I disagree with this approach." },
		{
			userId: 3,
			username: "charlie",
			comment: "This is inappropriate content.",
		},
		{
			userId: 4,
			username: "diana",
			comment: "Thanks for sharing your thoughts!",
		},
	];

	for (const comment of userComments) {
		console.log(`\n👤 @${comment.username}: "${comment.comment}"`);

		const result = await ai.moderate({
			input: comment.comment,
		});

		if (result.error) {
			console.error(`❌ Error moderating comment:`, result.error.message);
			console.log("⚠️ Comment approved by default (moderation failed)");
		} else {
			const moderationResult = result.data.results[0];

			if (moderationResult.flagged) {
				console.log("🚩 COMMENT BLOCKED - Inappropriate content detected");
				console.log("   Reason(s):");
				Object.entries(moderationResult.categories).forEach(
					([category, isFlagged]) => {
						if (isFlagged) {
							const score = moderationResult.category_scores[category];
							console.log(`     - ${category}: ${(score * 100).toFixed(2)}%`);
						}
					},
				);
			} else {
				console.log("✅ COMMENT APPROVED - Safe to display");
			}
		}
	}
}

// Example: Content safety levels
async function contentSafetyLevelsExample() {
	console.log("🎯 Example: Content Safety Levels\n");

	const safetyTests = [
		{
			level: "Safe",
			content:
				"I love learning about artificial intelligence and machine learning!",
		},
		{
			level: "Borderline",
			content:
				"I'm really frustrated with this situation and want to express my anger.",
		},
		{
			level: "Unsafe",
			content:
				"Here are instructions for harmful activities that should not be shared.",
		},
	];

	for (const test of safetyTests) {
		console.log(`\n🎯 Testing ${test.level} content:`);
		console.log(`   Content: "${test.content}"`);

		const result = await ai.moderate({
			input: test.content,
		});

		if (result.error) {
			console.error(`❌ Error:`, result.error.message);
		} else {
			const moderationResult = result.data.results[0];
			console.log(
				`   Overall flagged: ${moderationResult.flagged ? "Yes" : "No"}`,
			);

			// Detailed category analysis
			console.log("   Detailed analysis:");
			Object.entries(moderationResult.categories).forEach(
				([category, flagged]) => {
					const score = moderationResult.category_scores[category];
					const status = flagged ? "⚠️ FLAGGED" : "✅ Safe";
					console.log(
						`     - ${category}: ${status} (${(score * 100).toFixed(2)}%)`,
					);
				},
			);
		}
	}
}

// Example: Multi-language moderation
async function multiLanguageModerationExample() {
	console.log("🎯 Example: Multi-language Moderation\n");

	const multiLanguageContent = [
		{ language: "English", content: "This is a positive message in English." },
		{ language: "Spanish", content: "Este es un mensaje positivo en español." },
		{ language: "French", content: "Ceci est un message positif en français." },
		{
			language: "German",
			content: "Dies ist eine positive Nachricht auf Deutsch.",
		},
		{
			language: "Japanese",
			content: "これは日本語のポジティブなメッセージです。",
		},
	];

	for (const { language, content } of multiLanguageContent) {
		console.log(`\n🌍 ${language}: "${content}"`);

		const result = await ai.moderate({
			input: content,
		});

		if (result.error) {
			console.error(`❌ Error with ${language}:`, result.error.message);
		} else {
			const moderationResult = result.data.results[0];
			console.log(`   Flagged: ${moderationResult.flagged ? "Yes" : "No"}`);

			if (!moderationResult.flagged) {
				console.log("   ✅ Content is safe");
			} else {
				console.log("   ⚠️ Content flagged for review");
			}
		}
	}
}

// Example: Custom moderation thresholds
async function customThresholdsExample() {
	console.log("🎯 Example: Custom Moderation Thresholds\n");

	console.log("🔧 Implementing custom logic based on category scores:");
	console.log("   - Low threshold (0.1): Very strict filtering");
	console.log("   - Medium threshold (0.5): Standard filtering");
	console.log("   - High threshold (0.8): Lenient filtering");

	const testContent = "This content might be borderline inappropriate.";

	const thresholds = [
		{ name: "Very Strict", value: 0.1 },
		{ name: "Standard", value: 0.5 },
		{ name: "Lenient", value: 0.8 },
	];

	const result = await ai.moderate({
		input: testContent,
	});

	if (result.error) {
		console.error("❌ Error:", result.error.message);
		return;
	}

	const moderationResult = result.data.results[0];

	for (const threshold of thresholds) {
		console.log(`\n📊 ${threshold.name} threshold (${threshold.value}):`);

		let customFlagged = false;
		const flaggedCategories = [];

		Object.entries(moderationResult.category_scores).forEach(
			([category, score]) => {
				if (score >= threshold.value) {
					customFlagged = true;
					flaggedCategories.push(`${category} (${(score * 100).toFixed(2)}%)`);
				}
			},
		);

		console.log(`   Custom flagged: ${customFlagged ? "Yes" : "No"}`);
		if (customFlagged) {
			console.log(`   Flagged categories: ${flaggedCategories.join(", ")}`);
		}
	}
}

// Run the examples
if (import.meta.main) {
	await moderationExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await realTimeFilteringExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await contentSafetyLevelsExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await multiLanguageModerationExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await customThresholdsExample();
}

export {
	moderationExample,
	realTimeFilteringExample,
	contentSafetyLevelsExample,
	multiLanguageModerationExample,
	customThresholdsExample,
};
