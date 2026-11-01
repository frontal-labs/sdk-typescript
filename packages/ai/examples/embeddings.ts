/**
 * Embeddings Example
 *
 * Turns texts into vectors with `ai.embeddings`. Vectors come back in input
 * order, so `embeddings[i]` belongs to `inputs[i]`.
 */

import { EmbeddingRequestError, ai } from "../src";

const inputs = [
	"Refund for a duplicate charge",
	"The app crashes when I log in",
];

async function embeddingsExample() {
	console.log("[START] Starting Embeddings Example\n");

	try {
		const { embeddings, usage } = await ai.embeddings.embedMany({
			model: "openai/text-embedding-3-large",
			input: inputs,
		});

		inputs.forEach((text, i) => {
			console.log(`${text}: ${embeddings[i]?.length ?? 0} dimensions`);
		});
		console.log(`Tokens: ${usage.totalTokens}`);
	} catch (error) {
		if (error instanceof EmbeddingRequestError) {
			console.error("[ERROR] Invalid request:", error.issues);
		} else {
			console.error("[ERROR]", error);
		}
	}
}

embeddingsExample().catch(console.error);
