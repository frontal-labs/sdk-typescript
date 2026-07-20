/**
 * @frontal-labs/ai
 *
 * A powerful, type-safe AI SDK for Frontal
 * Provides unified access to LLMs, embeddings, and more.
 */

export { createAIClient, ai, type AIClientConfig } from "./client";
export { VERSION, DEFAULT_AI_BASE_URL } from "./constants";
export { AISdk } from "./sdk";
export * from "./schemas";
