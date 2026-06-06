/**
 * Video Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to generate videos from text prompts using video generation models.
 */

import { ai } from "../src";

// Initialize the AI client

async function videoGenerationExample() {
	console.log("🚀 Starting Video Generation Example\n");

	try {
		// Example 1: Basic video generation
		console.log("📝 Example 1: Basic video generation");
		const result1 = await ai.generateVideo({
			prompt:
				"A serene mountain landscape with flowing water and sunrise, cinematic quality",
			model: "video-gen-1",
			duration: 10,
			resolution: "1280x720",
		});

		if (result1.error) {
			console.error("❌ Error:", result1.error.message);
		} else {
			console.log("✅ Video generated successfully!");
			console.log("🔗 Video URL:", result1.data.videoUrl);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Different durations
		console.log("📝 Example 2: Different video durations");
		const durations = [5, 10, 15, 30];

		for (const duration of durations) {
			const result = await ai.generateVideo({
				prompt: "Abstract art with geometric shapes and smooth animations",
				model: "video-gen-1",
				duration: duration,
				resolution: "1024x576",
			});

			if (result.error) {
				console.error(`❌ Error with ${duration}s:`, result.error.message);
			} else {
				console.log(`✅ Generated ${duration}s video: ${result.data.videoUrl}`);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Different resolutions
		console.log("📝 Example 3: Different video resolutions");
		const resolutions = [
			{ name: "Mobile", resolution: "640x360" },
			{ name: "SD", resolution: "1024x576" },
			{ name: "HD", resolution: "1280x720" },
			{ name: "Full HD", resolution: "1920x1080" },
		];

		for (const { name, resolution } of resolutions) {
			const result = await ai.generateVideo({
				prompt: "Nature documentary style: birds flying over forest canopy",
				model: "video-gen-1",
				duration: 8,
				resolution: resolution,
			});

			if (result.error) {
				console.error(
					`❌ Error with ${name} (${resolution}):`,
					result.error.message,
				);
			} else {
				console.log(`✅ Generated ${name} video: ${result.data.videoUrl}`);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Different aspect ratios
		console.log("📝 Example 4: Different aspect ratios");
		const aspectRatios = [
			{ name: "Square", ratio: "1:1" },
			{ name: "Portrait", ratio: "9:16" },
			{ name: "Landscape", ratio: "16:9" },
			{ name: "Cinema", ratio: "21:9" },
		];

		for (const { name, ratio } of aspectRatios) {
			const result = await ai.generateVideo({
				prompt: "Modern city skyline at night with neon lights",
				model: "video-gen-1",
				duration: 12,
				aspectRatio: ratio,
			});

			if (result.error) {
				console.error(
					`❌ Error with ${name} (${ratio}):`,
					result.error.message,
				);
			} else {
				console.log(`✅ Generated ${name} video: ${result.data.videoUrl}`);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Different frame rates
		console.log("📝 Example 5: Different frame rates");
		const frameRates = [24, 30, 60];

		for (const fps of frameRates) {
			const result = await ai.generateVideo({
				prompt:
					"Slow motion water droplet falling on leaf, macro photography style",
				model: "video-gen-1",
				duration: 6,
				fps: fps,
			});

			if (result.error) {
				console.error(`❌ Error with ${fps}fps:`, result.error.message);
			} else {
				console.log(`✅ Generated ${fps}fps video: ${result.data.videoUrl}`);
			}
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Themed video generation
async function themedVideoExample() {
	console.log("🎯 Advanced Example: Themed Video Generation\n");

	const themes = [
		{
			name: "Nature",
			prompts: [
				"Tropical beach with palm trees swaying in breeze, crystal clear water",
				"Mountain meadow with wildflowers, golden hour lighting",
				"Rainforest with waterfall, misty atmosphere, exotic birds",
				"Arctic landscape with northern lights, snow-covered terrain",
			],
		},
		{
			name: "Urban",
			prompts: [
				"Futuristic city with flying vehicles, neon architecture, cyberpunk style",
				"Historic European town square, cobblestone streets, warm lighting",
				"Modern Tokyo street at night, busy intersection, vibrant signs",
				"Abandoned industrial area, overgrown with nature, post-apocalyptic mood",
			],
		},
		{
			name: "Abstract",
			prompts: [
				"Geometric patterns morphing and flowing, vibrant colors, minimalist design",
				"Particle system creating organic shapes, ethereal lighting effects",
				"Liquid metal surface with reflections, smooth animations, surreal",
				"Fractal patterns zooming in and out, mathematical beauty, kaleidoscope effect",
			],
		},
	];

	for (const theme of themes) {
		console.log(`\n🎨 Generating ${theme.name} themed videos:`);

		for (let i = 0; i < theme.prompts.length; i++) {
			const prompt = theme.prompts[i];
			console.log(`\n📹 Video ${i + 1}: ${prompt.substring(0, 50)}...`);

			const result = await ai.generateVideo({
				prompt: prompt,
				model: "video-gen-1",
				duration: 8,
				resolution: "1024x576",
			});

			if (result.error) {
				console.error(`❌ Error:`, result.error.message);
			} else {
				console.log(`✅ Generated: ${result.data.videoUrl}`);
			}
		}
	}
}

// Example: Product demonstration videos
async function productDemoExample() {
	console.log("🎯 Example: Product Demonstration Videos\n");

	const products = [
		{
			name: "Smartphone",
			prompt:
				" Sleek smartphone rotating on white background, showing screen interface, professional lighting",
			features: ["360 rotation", "screen display", "premium lighting"],
		},
		{
			name: "Headphones",
			prompt:
				"Wireless headphones on person, music visualization, modern lifestyle setting",
			features: ["product in use", "lifestyle context", "audio effects"],
		},
		{
			name: "Smartwatch",
			prompt:
				"Smartwatch showing fitness tracking, heart rate monitor, outdoor activity scene",
			features: ["worn device", "activity tracking", "outdoor setting"],
		},
		{
			name: "Laptop",
			prompt:
				"Laptop opening to show sleek design, keyboard backlight, productivity apps on screen",
			features: ["product design", "user interface", "work context"],
		},
	];

	for (const product of products) {
		console.log(`\n📱 Creating ${product.name} demo video:`);
		console.log(`   Features: ${product.features.join(", ")}`);

		const result = await ai.generateVideo({
			prompt: product.prompt,
			model: "video-gen-1",
			duration: 15,
			resolution: "1280x720",
			fps: 30,
		});

		if (result.error) {
			console.error(
				`❌ Error creating ${product.name} video:`,
				result.error.message,
			);
		} else {
			console.log(`✅ ${product.name} demo: ${result.data.videoUrl}`);
		}
	}
}

// Example: Educational content videos
async function educationalContentExample() {
	console.log("🎯 Example: Educational Content Videos\n");

	const educationalTopics = [
		{
			subject: "Science",
			topic: "Photosynthesis",
			prompt:
				"Animated diagram showing how plants convert sunlight into energy, chlorophyll visualization",
			duration: 20,
		},
		{
			subject: "Mathematics",
			topic: "Pythagorean Theorem",
			prompt:
				"Geometric animation proving the Pythagorean theorem with colorful triangles",
			duration: 15,
		},
		{
			subject: "History",
			topic: "Ancient Rome",
			prompt:
				"Animated map showing expansion of Roman Empire, historical timeline effects",
			duration: 25,
		},
		{
			subject: "Technology",
			topic: "Internet Protocol",
			prompt:
				"Network diagram showing data packets traveling through internet infrastructure",
			duration: 18,
		},
	];

	for (const content of educationalTopics) {
		console.log(
			`\n📚 Creating ${content.subject} video about ${content.topic}:`,
		);

		const result = await ai.generateVideo({
			prompt: content.prompt,
			model: "video-gen-1",
			duration: content.duration,
			resolution: "1280x720",
			fps: 24, // Cinematic frame rate for educational content
		});

		if (result.error) {
			console.error(
				`❌ Error creating ${content.topic} video:`,
				result.error.message,
			);
		} else {
			console.log(
				`✅ ${content.topic} educational video: ${result.data.videoUrl}`,
			);
			console.log(`   Duration: ${content.duration}s`);
		}
	}
}

// Example: Art style exploration
async function artStyleExample() {
	console.log("🎯 Example: Art Style Exploration\n");

	const basePrompt = "A majestic eagle soaring through mountain peaks";
	const styles = [
		{
			name: "Photorealistic",
			modifier: "photorealistic, 8K resolution, natural lighting",
		},
		{
			name: "Anime",
			modifier: "anime style, vibrant colors, dynamic motion lines",
		},
		{
			name: "Watercolor",
			modifier: "watercolor painting style, soft edges, flowing colors",
		},
		{
			name: "Oil Painting",
			modifier: "oil painting style, rich textures, classical composition",
		},
		{
			name: "Pixel Art",
			modifier: "pixel art style, 16-bit aesthetic, blocky animation",
		},
		{
			name: "Claymation",
			modifier: "claymation style, textured surface, stop motion effect",
		},
	];

	for (const style of styles) {
		console.log(`\n🎨 Generating ${style.name} style video:`);

		const styledPrompt = `${basePrompt}, ${style.modifier}`;

		const result = await ai.generateVideo({
			prompt: styledPrompt,
			model: "video-gen-1",
			duration: 10,
			resolution: "1024x576",
		});

		if (result.error) {
			console.error(`❌ Error with ${style.name} style:`, result.error.message);
		} else {
			console.log(`✅ ${style.name} style video: ${result.data.videoUrl}`);
		}
	}
}

// Example: Video optimization and comparison
async function videoOptimizationExample() {
	console.log("🎯 Example: Video Optimization and Comparison\n");

	const testPrompt = "A robot assembling a mechanical device, factory setting";

	// Test different optimization parameters
	const optimizationTests = [
		{
			name: "Standard Quality",
			duration: 10,
			resolution: "1024x576",
			fps: 24,
		},
		{
			name: "High Quality",
			duration: 10,
			resolution: "1920x1080",
			fps: 30,
		},
		{
			name: "Optimized for Mobile",
			duration: 8,
			resolution: "640x360",
			fps: 24,
		},
		{
			name: "Social Media Format",
			duration: 15,
			resolution: "1080x1080",
			fps: 30,
		},
	];

	for (const test of optimizationTests) {
		console.log(`\n⚡ Testing ${test.name}:`);
		console.log(`   Duration: ${test.duration}s`);
		console.log(`   Resolution: ${test.resolution}`);
		console.log(`   FPS: ${test.fps}`);

		const startTime = Date.now();

		const result = await ai.generateVideo({
			prompt: testPrompt,
			model: "video-gen-1",
			duration: test.duration,
			resolution: test.resolution,
			fps: test.fps,
		});

		const endTime = Date.now();
		const generationTime = endTime - startTime;

		if (result.error) {
			console.error(`❌ Error:`, result.error.message);
		} else {
			console.log(`✅ Generated in ${generationTime}ms`);
			console.log(`   Video URL: ${result.data.videoUrl}`);
			console.log(`   Estimated file size: ~${test.duration * test.fps * 2}MB`); // Rough estimate
		}
	}
}

// Run the examples
if (import.meta.main) {
	await videoGenerationExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await themedVideoExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await productDemoExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await educationalContentExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await artStyleExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await videoOptimizationExample();
}

export {
	videoGenerationExample,
	themedVideoExample,
	productDemoExample,
	educationalContentExample,
	artStyleExample,
	videoOptimizationExample,
};
