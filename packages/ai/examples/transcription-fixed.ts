/**
 * Audio Transcription Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to transcribe audio files to text using speech-to-text models.
 */

import { AI } from "../src";

// Initialize the AI client
const ai = new AI();

async function transcriptionExample() {
	console.log("🚀 Starting Audio Transcription Example\n");

	try {
		// Example 1: Basic transcription
		console.log("📝 Example 1: Basic transcription");

		// Note: In a real scenario, you would have an actual audio file
		// For this example, we'll show the structure but skip the actual file processing
		console.log("📁 To run this example, provide an actual audio file:");
		console.log("   - Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm");
		console.log("   - Maximum file size: 25MB");

		// Example structure (commented out since we don't have an actual file):
		/*
    const audioFile = new Blob([audio data], { type: 'audio/mp3' });
    
    const result1 = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
    });

    if (result1.error) {
      console.error("❌ Error:", result1.error.message);
    } else {
      console.log("✅ Transcription completed!");
      console.log("📝 Transcribed text:", result1.data.text);
    }
    */

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Transcription with language specification
		console.log("📝 Example 2: Transcription with language specification");
		console.log(
			"🌍 Supported languages: en, es, fr, de, it, pt, ja, zh, ko, ru, ar, hi, and more",
		);

		/*
    const result2 = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Specify English
    });

    if (result2.error) {
      console.error("❌ Error:", result2.error.message);
    } else {
      console.log("✅ English transcription completed!");
      console.log("📝 Transcribed text:", result2.data.text);
    }
    */

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Transcription with prompt for context
		console.log("📝 Example 3: Transcription with context prompt");
		console.log("💡 Use a prompt to provide context or specify terminology");

		/*
    const result3 = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      prompt: "This is a medical consultation about cardiology. Terms include: ECG, stent, angiogram.",
    });

    if (result3.error) {
      console.error("❌ Error:", result3.error.message);
    } else {
      console.log("✅ Medical transcription completed!");
      console.log("📝 Transcribed text:", result3.data.text);
    }
    */

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: Different response formats
		console.log("📝 Example 4: Different response formats");
		console.log("📋 Available formats: json, text, srt, verbose_json, vtt");

		// JSON format with timestamps
		/*
    const result4a = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    if (result4a.error) {
      console.error("❌ Error:", result4a.error.message);
    } else {
      console.log("✅ JSON format with timestamps!");
      console.log("📝 Data:", JSON.stringify(result4a.data, null, 2));
    }
    */

		// SRT format for subtitles
		/*
    const result4b = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      response_format: "srt",
    });

    if (result4b.error) {
      console.error("❌ Error:", result4b.error.message);
    } else {
      console.log("✅ SRT subtitle format!");
      console.log("📝 Subtitles:", result4b.data.text);
    }
    */

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 5: Temperature control for transcription
		console.log("📝 Example 5: Temperature control");
		console.log("🌡️ Temperature affects the randomness of the transcription");
		console.log("   - Lower (0.0): More deterministic, better for clear audio");
		console.log("   - Higher (1.0): More creative, better for ambiguous audio");

		/*
    const result5 = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      temperature: 0.2, // Lower temperature for more accuracy
    });

    if (result5.error) {
      console.error("❌ Error:", result5.error.message);
    } else {
      console.log("✅ Low temperature transcription!");
      console.log("📝 Transcribed text:", result5.data.text);
    }
    */
	} catch (error) {
		console.error("❌ Unexpected error:", error);
	}
}

// Advanced example: Batch transcription
async function batchTranscriptionExample() {
	console.log("🎯 Advanced Example: Batch Transcription\n");

	console.log("📁 Processing multiple audio files:");
	console.log("   - File 1: Meeting recording");
	console.log("   - File 2: Interview segment");
	console.log("   - File 3: Lecture audio");

	/*
  const audioFiles = [
    { name: "meeting.mp3", file: audio blob },
    { name: "interview.mp3", file: audio blob },
    { name: "lecture.mp3", file: audio blob },
  ];

  for (const { name, file } of audioFiles) {
    console.log(`🔄 Processing ${name}...`);
    
    const result = await ai.transcribe({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    if (result.error) {
      console.error(`❌ Error with ${name}:`, result.error.message);
    } else {
      console.log(`✅ Completed ${name}`);
      console.log(`📝 Duration: ${result.data.duration} seconds`);
      console.log(`📝 Text: ${result.data.text.substring(0, 100)}...`);
    }
  }
  */
}

// Example: Real-time transcription simulation
async function realTimeTranscriptionExample() {
	console.log("🎯 Example: Real-time Transcription Simulation\n");

	console.log(
		"🎙️ Simulating real-time transcription by processing audio chunks:",
	);
	console.log("   - Split audio into 30-second chunks");
	console.log("   - Process each chunk individually");
	console.log("   - Combine results with timestamps");

	/*
  const audioChunks = [
    { start: 0, end: 30, data: chunk 1 },
    { start: 30, end: 60, data: chunk 2 },
    { start: 60, end: 90, data: chunk 3 },
  ];

  const transcriptions = [];

  for (const chunk of audioChunks) {
    console.log(`🔄 Processing chunk ${chunk.start}s - ${chunk.end}s...`);
    
    const result = await ai.transcribe({
      file: chunk.data,
      model: "whisper-1",
      response_format: "verbose_json",
      temperature: 0.1, // Low temperature for consistency
    });

    if (result.error) {
      console.error(`❌ Error with chunk ${chunk.start}-${chunk.end}:`, result.error.message);
    } else {
      transcriptions.push({
        start: chunk.start,
        end: chunk.end,
        text: result.data.text,
        words: result.data.words || [],
      });
      console.log(`✅ Chunk ${chunk.start}s - ${chunk.end}s completed`);
    }
  }

  console.log("📝 Combined transcription:");
  transcriptions.forEach((trans) => {
    console.log(`[${trans.start}s-${trans.end}s]: ${trans.text}`);
  });
  */
}

// Example: Multi-language transcription
async function multiLanguageTranscriptionExample() {
	console.log("🎯 Example: Multi-language Transcription\n");

	const languageExamples = [
		{ language: "en", name: "English", prompt: "Hello, how are you today?" },
		{ language: "es", name: "Spanish", prompt: "Hola, ¿cómo estás hoy?" },
		{
			language: "fr",
			name: "French",
			prompt: "Bonjour, comment allez-vous aujourd'hui?",
		},
		{
			language: "de",
			name: "German",
			prompt: "Hallo, wie geht es Ihnen heute?",
		},
		{
			language: "ja",
			name: "Japanese",
			prompt: "こんにちは、今日はお元気ですか？",
		},
	];

	for (const { language, name, prompt } of languageExamples) {
		console.log(`🌍 ${name} transcription example:`);
		console.log(`   Language code: ${language}`);
		console.log(`   Sample text: ${prompt}`);
		console.log(`   Expected output: Transcribed ${name} text`);

		/*
    const result = await ai.transcribe({
      file: audioFileInLanguage,
      model: "whisper-1",
      language: language,
    });

    if (result.error) {
      console.error(`❌ Error with ${name}:`, result.error.message);
    } else {
      console.log(`✅ ${name} transcription completed!`);
      console.log(`📝 Text: ${result.data.text}`);
    }
    */

		console.log("");
	}
}

// Example: Transcription quality analysis
async function qualityAnalysisExample() {
	console.log("🎯 Example: Transcription Quality Analysis\n");

	console.log("🔍 Analyzing transcription quality:");
	console.log("   - Compare different temperature settings");
	console.log("   - Test with and without prompts");
	console.log("   - Evaluate different audio qualities");

	const testCases = [
		{
			name: "High quality audio, low temperature",
			temperature: 0.1,
			prompt: undefined,
		},
		{
			name: "High quality audio, high temperature",
			temperature: 0.8,
			prompt: undefined,
		},
		{
			name: "High quality audio with context",
			temperature: 0.2,
			prompt: "Technical discussion about software development",
		},
		{
			name: "Low quality audio, low temperature",
			temperature: 0.1,
			prompt: undefined,
		},
	];

	for (const testCase of testCases) {
		console.log(`🧪 Testing: ${testCase.name}`);

		/*
    const result = await ai.transcribe({
      file: audioFile,
      model: "whisper-1",
      temperature: testCase.temperature,
      prompt: testCase.prompt,
      response_format: "verbose_json",
    });

    if (result.error) {
      console.error(`❌ Error:`, result.error.message);
    } else {
      console.log(`✅ Completed`);
      console.log(`📝 Confidence: ${result.data.avg_logprob || 'N/A'}`);
      console.log(`📝 No speech probability: ${result.data.no_speech_prob || 'N/A'}`);
      console.log(`📝 Text length: ${result.data.text.length} characters`);
    }
    */

		console.log("");
	}
}

// Run the examples
if (import.meta.main) {
	await transcriptionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await batchTranscriptionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await realTimeTranscriptionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await multiLanguageTranscriptionExample();
	console.log("\n" + "=".repeat(60) + "\n");
	await qualityAnalysisExample();
}

export {
	transcriptionExample,
	batchTranscriptionExample,
	realTimeTranscriptionExample,
	multiLanguageTranscriptionExample,
	qualityAnalysisExample,
};
