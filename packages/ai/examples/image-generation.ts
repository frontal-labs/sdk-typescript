/**
 * Image Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to generate images from text prompts using image generation models.
 */

import { AI } from "../src";
import { writeFileSync } from "fs";

// Initialize the AI client
const ai = new AI();

async function imageGeneration() {
	console.log("🚀 Starting Image Generation Example\n");

	try {
		// Example 1: Basic image generation
		console.log("📝 Example 1: Basic image generation");
		const result1 = await ai.generateImage({
			prompt: "A beautiful sunset over a mountain lake",
			model: "dall-e-3",
			n: 1,
			size: "1024x1024",
		});

		if (result1.error) {
			console.error("❌ Error:", result1.error.message);
		} else {
			console.log("✅ Image generated successfully!");
			console.log("📏 Number of images:", result1.data.images.length);

			if (result1.data.images[0].url) {
				console.log("🔗 Image URL:", result1.data.images[0].url);
			}
			if (result1.data.images[0].b64_json) {
				// Save base64 image
				const base64Data = result1.data.images[0].b64_json;
				const buffer = Buffer.from(base64Data, "base64");
				writeFileSync("sunset_lake.png", buffer);
				console.log("💾 Saved as sunset_lake.png");
			}
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Different sizes
		console.log("📝 Example 2: Different image sizes");
		const sizes = ["1024x1024", "1792x1024", "1024x1792"] as const;

		for (const size of sizes) {
			const result = await ai.generateImage({
				prompt: "A cute robot reading a book",
				model: "dall-e-3",
				size: size,
				n: 1,
			});

			if (result.error) {
				console.error(`❌ Error with size ${size}:`, result.error.message);
			} else {
				console.log(`✅ Generated ${size} image`);
				if (result.data.images[0].url) {
					console.log(`   URL: ${result.data.images[0].url}`);
				}
			}
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Quality settings
		console.log("📝 Example 3: Quality settings");
		const qualities = ["standard", "hd"] as const;

		for (const quality of qualities) {
			const result = await ai.generateImage({
				prompt: "A detailed portrait of a fantasy wizard",
				model: "dall-e-3",
				quality: quality,
				size: "1024x1024",
				n: 1,
			});

			if (result.error) {
				console.error(
					`❌ Error with quality ${quality}:`,
					result.error.message,
				);
			} else {
				console.log(`✅ Generated ${quality} quality image`);
				if (result.data.images[0].url) {
					console.log(`   URL: ${result.data.images[0].url}`);
				}
			}
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: Style settings
		console.log("📝 Example 4: Style settings");
		const styles = ["natural", "vivid"] as const;

		for (const style of styles) {
			const result = await ai.generateImage({
				prompt: "A futuristic city with flying cars",
				model: "dall-e-3",
				style: style,
				size: "1024x1024",
				n: 1,
			});

			if (result.error) {
				console.error(`❌ Error with style ${style}:`, result.error.message);
			} else {
				console.log(`✅ Generated ${style} style image`);
				if (result.data.images[0].url) {
					console.log(`   URL: ${result.data.images[0].url}`);
				}
			}
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 5: Multiple images
		console.log("📝 Example 5: Multiple images generation");
		const result5 = await ai.generateImage({
			prompt: "Abstract geometric patterns with vibrant colors",
			model: "dall-e-3",
			n: 2, // Generate 2 images
			size: "1024x1024",
		});

		if (result5.error) {
			console.error("❌ Error:", result5.error.message);
		} else {
			console.log(`✅ Generated ${result5.data.images.length} images`);
			result5.data.images.forEach((image, index) => {
				if (image.url) {
					console.log(`   Image ${index + 1}: ${image.url}`);
				}
			});
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Art style exploration
async function artStyleExploration() {
	console.log("🎯 Advanced Example: Art Style Exploration\n");

	const basePrompt = "A serene landscape with mountains and a lake";
	const styles = [
		"in the style of impressionism",
		"in the style of cubism",
		"in the style of surrealism",
		"in the style of art deco",
		"in the style of minimalism",
		"in the style of watercolor painting",
		"in the style of oil painting",
		"in the style of Japanese ukiyo-e",
	];

	for (const style of styles) {
		const result = await ai.generateImage({
			prompt: `${basePrompt} ${style}`,
			model: "dall-e-3",
			size: "1024x1024",
			n: 1,
			quality: "standard",
		});

		if (result.error) {
			console.error(`❌ Error with ${style}:`, result.error.message);
		} else {
			console.log(`✅ Generated ${style}`);
			if (result.data.images[0].url) {
				console.log(`   URL: ${result.data.images[0].url}`);
			}
		}
	}
}

// Example: Product visualization
async function productVisualization() {
	console.log("🎯 Example: Product Visualization\n");

	const products = [
		{
			name: "smartwatch",
			prompt: "A modern smartwatch on a wooden desk, product photography style",
		},
		{
			name: "headphones",
			prompt:
				"Wireless headphones floating against a gradient background, minimalist design",
		},
		{
			name: "coffee-mug",
			prompt:
				"A ceramic coffee mug with steam rising, morning light, cozy atmosphere",
		},
		{
			name: "backpack",
			prompt:
				"A durable outdoor backpack with hiking gear, mountain background",
		},
	];

	for (const product of products) {
		const result = await ai.generateImage({
			prompt: product.prompt,
			model: "dall-e-3",
			size: "1024x1024",
			n: 1,
			quality: "hd",
			style: "natural",
		});

		if (result.error) {
			console.error(`❌ Error with ${product.name}:`, result.error.message);
		} else {
			console.log(`✅ Generated ${product.name} visualization`);
			if (result.data.images[0].url) {
				console.log(`   URL: ${result.data.images[0].url}`);
			}
		}
	}
}

// Example: Character design
async function characterDesign() {
	console.log("🎯 Example: Character Design\n");

	const characters = [
		{
			name: "space-explorer",
			prompt:
				"A brave space explorer with futuristic helmet and suit, standing on Mars",
		},
		{
			name: "fantasy-wizard",
			prompt:
				"An elderly wizard with long white beard and flowing robes, holding a magical staff",
		},
		{
			name: "cyberpunk-hacker",
			prompt:
				"A cyberpunk hacker with neon-lit goggles and cybernetic implants, in a dark alley",
		},
		{
			name: "steampunk-inventor",
			prompt:
				"A Victorian-era inventor with goggles and gears, in a workshop full of contraptions",
		},
	];

	for (const character of characters) {
		const result = await ai.generateImage({
			prompt: character.prompt,
			model: "dall-e-3",
			size: "1024x1024",
			n: 1,
			quality: "hd",
			style: "vivid",
		});

		if (result.error) {
			console.error(`❌ Error with ${character.name}:`, result.error.message);
		} else {
			console.log(`✅ Generated ${character.name} character`);
			if (result.data.images[0].url) {
				console.log(`   URL: ${result.data.images[0].url}`);
			}
		}
	}
}

// Example: Architectural visualization
async function architecturalVisualization() {
	console.log("🎯 Example: Architectural Visualization\n");

	const architectures = [
		{
			name: "modern-house",
			prompt:
				"A modern minimalist house with glass walls and clean lines, surrounded by nature",
		},
		{
			name: "gothic-cathedral",
			prompt:
				"A majestic Gothic cathedral with stained glass windows and flying buttresses",
		},
		{
			name: "futuristic-city",
			prompt:
				"A futuristic city skyline with towering skyscrapers and flying vehicles",
		},
		{
			name: "japanese-temple",
			prompt:
				"A traditional Japanese temple with cherry blossoms and zen garden",
		},
	];

	for (const arch of architectures) {
		const result = await ai.generateImage({
			prompt: arch.prompt,
			model: "dall-e-3",
			size: "1792x1024", // Wider aspect ratio for architecture
			n: 1,
			quality: "hd",
			style: "natural",
		});

		if (result.error) {
			console.error(`❌ Error with ${arch.name}:`, result.error.message);
		} else {
			console.log(`✅ Generated ${arch.name} visualization`);
			if (result.data.images[0].url) {
				console.log(`   URL: ${result.data.images[0].url}`);
			}
		}
	}
}

// Run the examples
if (import.meta.main) {
	await imageGeneration();
	console.log("\n" + "=".repeat(60) + "\n");
	await artStyleExploration();
	console.log("\n" + "=".repeat(60) + "\n");
	await productVisualization();
	console.log("\n" + "=".repeat(60) + "\n");
	await characterDesign();
	console.log("\n" + "=".repeat(60) + "\n");
	await architecturalVisualization();
}

export {
	imageGeneration,
	artStyleExploration,
	productVisualization,
	characterDesign,
	architecturalVisualization,
};
