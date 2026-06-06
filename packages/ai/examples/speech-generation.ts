/**
 * Speech Generation Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to generate speech/audio from text using text-to-speech models.
 */

import { writeFileSync } from "node:fs";
import { ai } from "../src";

// Initialize the AI client

async function speechGeneration() {
	console.log("🚀 Starting Speech Generation Example\n");

	try {
		// Example 1: Basic speech generation
		console.log("📝 Example 1: Basic speech generation");
		const result1 = await ai.generateSpeech({
			text: "Hello, world! This is a test of the text-to-speech system.",
			voice: "alloy",
			model: "tts-1",
		});

		if (result1.error) {
			console.error("❌ Error:", result1.error.message);
		} else {
			console.log("✅ Speech generated successfully!");
			console.log("📏 Audio size:", result1.data.byteLength, "bytes");

			// Save the audio to a file
			writeFileSync("output1.mp3", Buffer.from(result1.data));
			console.log("💾 Saved as output1.mp3");
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Different voices
		console.log("📝 Example 2: Different voices");
		const voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

		for (const voice of voices) {
			const result = await ai.generateSpeech({
				text: `This is the ${voice} voice speaking.`,
				voice: voice,
				model: "tts-1",
			});

			if (result.error) {
				console.error(`❌ Error with ${voice}:`, result.error.message);
			} else {
				writeFileSync(`voice_${voice}.mp3`, Buffer.from(result.data));
				console.log(
					`✅ Generated ${voice} voice sample (${result.data.byteLength} bytes)`,
				);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Different formats
		console.log("📝 Example 3: Different audio formats");
		const formats = ["mp3", "wav", "opus"] as const;

		for (const format of formats) {
			const result = await ai.generateSpeech({
				text: "This audio is generated in different formats.",
				voice: "alloy",
				model: "tts-1",
				format: format,
			});

			if (result.error) {
				console.error(`❌ Error with ${format}:`, result.error.message);
			} else {
				const filename = `format_${format}.${format}`;
				writeFileSync(filename, Buffer.from(result.data));
				console.log(
					`✅ Generated ${format} format (${result.data.byteLength} bytes)`,
				);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Speed control
		console.log("📝 Example 4: Speed control");
		const speeds = [0.5, 1.0, 1.5, 2.0];

		for (const speed of speeds) {
			const result = await ai.generateSpeech({
				text: "This speech is generated at different speeds.",
				voice: "alloy",
				model: "tts-1",
				speed: speed,
			});

			if (result.error) {
				console.error(`❌ Error with speed ${speed}:`, result.error.message);
			} else {
				const filename = `speed_${speed}x.mp3`;
				writeFileSync(filename, Buffer.from(result.data));
				console.log(
					`✅ Generated ${speed}x speed (${result.data.byteLength} bytes)`,
				);
			}
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Long text generation
		console.log("📝 Example 5: Long text generation");
		const longText = `
      Artificial intelligence has revolutionized the way we interact with technology. 
      From virtual assistants to autonomous vehicles, AI is transforming every aspect of our daily lives. 
      Machine learning algorithms can now recognize patterns, make predictions, and even generate creative content. 
      As we continue to advance in this field, the possibilities seem endless. 
      The future of AI holds promise for solving some of humanity's most pressing challenges.
    `;

		const result5 = await ai.generateSpeech({
			text: longText.trim(),
			voice: "nova",
			model: "tts-1-hd", // Use HD model for better quality
		});

		if (result5.error) {
			console.error("❌ Error:", result5.error.message);
		} else {
			writeFileSync("long_speech.mp3", Buffer.from(result5.data));
			console.log("✅ Generated long speech sample");
			console.log("📏 Audio size:", result5.data.byteLength, "bytes");
			console.log(
				"⏱️ Estimated duration:",
				Math.round(result5.data.byteLength / 16000),
				"seconds",
			);
		}
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Multi-language speech generation
async function multiLanguageExample() {
	console.log("🎯 Advanced Example: Multi-language Speech Generation\n");

	const texts = [
		{ text: "Hello, how are you?", lang: "English", voice: "alloy" },
		{ text: "Bonjour, comment allez-vous?", lang: "French", voice: "alloy" },
		{ text: "Hola, ¿cómo estás?", lang: "Spanish", voice: "alloy" },
		{ text: "Guten Tag, wie geht es Ihnen?", lang: "German", voice: "alloy" },
		{ text: "こんにちは、元気ですか？", lang: "Japanese", voice: "alloy" },
	];

	for (const { text, lang, voice } of texts) {
		const result = await ai.generateSpeech({
			text: text,
			voice: voice,
			model: "tts-1",
		});

		if (result.error) {
			console.error(`❌ Error with ${lang}:`, result.error.message);
		} else {
			const filename = `multilang_${lang.toLowerCase()}.mp3`;
			writeFileSync(filename, Buffer.from(result.data));
			console.log(
				`✅ Generated ${lang} speech (${result.data.byteLength} bytes)`,
			);
		}
	}
}

// Example: Audio book chapter generation
async function audioBookExample() {
	console.log("🎯 Example: Audio Book Chapter Generation\n");

	const chapter = `
    Chapter 1: The Beginning
    
    In a small village nestled between rolling hills, there lived a young inventor named Clara. 
    She spent her days tinkering with gears, springs, and various mechanical contraptions. 
    One rainy afternoon, while working in her workshop, she discovered something extraordinary - 
    a small, ornate box that seemed to hum with an otherworldly energy.
    
    As Clara carefully examined the box, she noticed intricate carvings that seemed to shift 
    and change when she wasn't looking directly at them. The box felt warm to the touch, 
    and she could hear a faint, melodic sound coming from within.
    
    "What could this be?" she wondered aloud, her curiosity piqued like never before.
  `;

	// Split into paragraphs and generate speech for each
	const paragraphs = chapter
		.trim()
		.split("\n\n")
		.filter((p) => p.trim());

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i].trim();
		const result = await ai.generateSpeech({
			text: paragraph,
			voice: "nova",
			model: "tts-1-hd",
			speed: 0.9, // Slightly slower for better narration
		});

		if (result.error) {
			console.error(`❌ Error with paragraph ${i + 1}:`, result.error.message);
		} else {
			const filename = `chapter_01_part_${String(i + 1).padStart(2, "0")}.mp3`;
			writeFileSync(filename, Buffer.from(result.data));
			console.log(
				`✅ Generated paragraph ${i + 1} (${result.data.byteLength} bytes)`,
			);
		}
	}
}

// Example: Voice characteristics comparison
async function voiceCharacteristicsExample() {
	console.log("🎯 Example: Voice Characteristics Comparison\n");

	const testText =
		"The quick brown fox jumps over the lazy dog. This pangram contains all letters of the alphabet.";
	const voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

	console.log("🔄 Generating voice samples for comparison...");

	for (const voice of voices) {
		const result = await ai.generateSpeech({
			text: testText,
			voice: voice,
			model: "tts-1-hd",
		});

		if (result.error) {
			console.error(`❌ Error with ${voice}:`, result.error.message);
		} else {
			const filename = `voice_comparison_${voice}.mp3`;
			writeFileSync(filename, Buffer.from(result.data));
			console.log(
				`✅ Generated ${voice} comparison sample (${result.data.byteLength} bytes)`,
			);
		}
	}

	console.log("\n📊 Voice characteristics:");
	console.log("- alloy: Neutral, balanced voice");
	console.log("- echo: Male voice, slightly deeper");
	console.log("- fable: British accent, storytelling style");
	console.log("- onyx: Deep, authoritative voice");
	console.log("- nova: Female voice, clear and pleasant");
	console.log("- shimmer: Soft, gentle voice");
}

// Run the examples
if (import.meta.main) {
	await speechGeneration();
	console.log(`\n${"=".repeat(60)}\n`);
	await multiLanguageExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await audioBookExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await voiceCharacteristicsExample();
}

export {
	speechGeneration,
	multiLanguageExample,
	audioBookExample,
	voiceCharacteristicsExample,
};
