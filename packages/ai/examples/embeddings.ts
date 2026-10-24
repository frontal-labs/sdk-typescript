/**
 * Embeddings Example
 *
 * This example demonstrates how to use the Frontal AI SDK
 * to generate text embeddings for semantic search,
 * similarity comparison, and other vector operations.
 */

import { FrontalError } from "@frontal-labs/core";
import { ai } from "../src";

// Initialize the AI client

async function embeddingsExample() {
	console.log("[START] Starting Embeddings Example\n");

	try {
		// Example 1: Single text embedding
		console.log("[EXAMPLE] Example 1: Single text embedding");
		const result1 = await ai.embed({
			model: "text-embedding-3-small",
			input: "The quick brown fox jumps over the lazy dog.",
		});

		console.log("[SUCCESS] Embedding generated successfully!");
		console.log("[VECTOR] Embedding dimensions:", result1.embeddings[0].length);
		console.log("[USAGE] Usage:", result1.usage);
		console.log("[VALUES] First 5 values:", result1.embeddings[0].slice(0, 5));

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Multiple text embeddings
		console.log("[EXAMPLE] Example 2: Multiple text embeddings");
		const texts = [
			"Machine learning is a subset of artificial intelligence.",
			"Deep learning uses neural networks with multiple layers.",
			"Natural language processing helps computers understand text.",
			"Computer vision enables machines to interpret visual information.",
		];

		const result2 = await ai.embed({
			model: "text-embedding-3-small",
			input: texts,
		});

		console.log("[SUCCESS] Multiple embeddings generated!");
		console.log("[COUNT] Number of embeddings:", result2.embeddings.length);
		console.log("[VECTOR] Embedding dimensions:", result2.embeddings[0].length);
		console.log("[USAGE] Usage:", result2.usage);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Similarity comparison
		console.log("[EXAMPLE] Example 3: Text similarity comparison");
		const similarityTexts = [
			"The cat is sleeping on the couch.",
			"A feline is resting on the sofa.",
			"The dog is playing in the yard.",
			"Python is a popular programming language.",
		];

		const result3 = await ai.embed({
			model: "text-embedding-3-small",
			input: similarityTexts,
		});

		const vecs3 = result3.embeddings;

		// Calculate cosine similarity between first two texts (should be high)
		const similarity = cosineSimilarity(vecs3[0], vecs3[1]);
		console.log(
			"[SIMILARITY] Similarity between first two texts:",
			similarity.toFixed(4)
		);

		// Calculate cosine similarity between first and third texts (should be lower)
		const similarity2 = cosineSimilarity(vecs3[0], vecs3[2]);
		console.log(
			"[SIMILARITY] Similarity between first and third texts:",
			similarity2.toFixed(4)
		);

		// Calculate cosine similarity between first and fourth texts (should be very low)
		const similarity3 = cosineSimilarity(vecs3[0], vecs3[3]);
		console.log(
			"[SIMILARITY] Similarity between first and fourth texts:",
			similarity3.toFixed(4)
		);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Semantic search demonstration
		console.log("[EXAMPLE] Example 4: Semantic search demonstration");
		const documents = [
			"JavaScript is a programming language used for web development.",
			"Python is popular for data science and machine learning.",
			"React is a JavaScript library for building user interfaces.",
			"Machine learning algorithms can classify images and text.",
			"Node.js allows JavaScript to run on the server side.",
			"TensorFlow is a framework for deep learning applications.",
		];

		const query = "web development with JavaScript";

		// Generate embeddings for all documents and the query
		const allTexts = [...documents, query];
		const result4 = await ai.embed({
			model: "text-embedding-3-small",
			input: allTexts,
		});

		const vecs4 = result4.embeddings;
		const queryEmbedding = vecs4[vecs4.length - 1]; // Last one is the query
		const documentEmbeddings = vecs4.slice(0, -1);

		// Calculate similarities and rank documents
		const similarities = documentEmbeddings.map((docEmbedding, index) => ({
			document: documents[index],
			similarity: cosineSimilarity(queryEmbedding, docEmbedding),
		}));

		// Sort by similarity (descending)
		similarities.sort((a, b) => b.similarity - a.similarity);

		console.log(`[SEARCH] Search results for query: "${query}"`);
		similarities.forEach((item, index) => {
			console.log(
				`${index + 1}. [${item.similarity.toFixed(4)}] ${item.document}`
			);
		});
	} catch (err) {
		if (err instanceof FrontalError) {
			console.error("[ERROR]", err.statusCode, err.message, err.fix ?? "");
		} else {
			throw err;
		}
	}
}

// Utility function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length) {
		throw new Error("Vectors must have the same length");
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		normA += vecA[i] * vecA[i];
		normB += vecB[i] * vecB[i];
	}

	normA = Math.sqrt(normA);
	normB = Math.sqrt(normB);

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (normA * normB);
}

// Advanced example: Clustering similar texts
async function clusteringExample() {
	console.log("🎯 Advanced Example: Text Clustering\n");

	const texts = [
		"Apple releases new iPhone model",
		"Samsung unveils latest Galaxy phone",
		"Google announces new Pixel device",
		"Machine learning breakthrough in healthcare",
		"AI advances in medical diagnosis",
		"Deep learning improves disease detection",
		"Tesla introduces new electric vehicle",
		"Ford launches electric SUV model",
		"BMW presents new electric car",
	];

	const { embeddings } = await ai.embed({
		model: "text-embedding-3-small",
		input: texts,
	});

	// Simple clustering based on similarity threshold
	const clusters: string[][] = [];
	const used = new Set<number>();

	for (let i = 0; i < embeddings.length; i++) {
		if (used.has(i)) continue;

		const cluster = [texts[i]];
		used.add(i);

		for (let j = i + 1; j < embeddings.length; j++) {
			if (used.has(j)) continue;

			const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
			if (similarity > 0.7) {
				// Threshold for clustering
				cluster.push(texts[j]);
				used.add(j);
			}
		}

		clusters.push(cluster);
	}

	console.log("📊 Found clusters:");
	clusters.forEach((cluster, index) => {
		console.log(`\nCluster ${index + 1}:`);
		cluster.forEach((text) => console.log(`  - ${text}`));
	});
}

// Run the examples
if (import.meta.main) {
	await embeddingsExample();
	console.log(`\n${"=".repeat(60)}\n`);
	await clusteringExample();
}

export { embeddingsExample, cosineSimilarity, clusteringExample };
