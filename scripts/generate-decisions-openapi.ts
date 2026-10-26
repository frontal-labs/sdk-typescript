/**
 * Writes the decisions routes and schemas into `contracts/openapi/ai.openapi.json`,
 * the single AI contract. The sections are derived from the Zod wire schemas in
 * `packages/ai/src/schemas.ts`, so the spec cannot drift from the client.
 *
 * `contract-sync` uses the same builder when it regenerates the gateway
 * routes, so the decisions sections survive a sync.
 *
 *   bun run contract:decisions            # update the decisions sections
 *   bun run contract:decisions --check    # fail if they are stale
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	decisionModelsSpecSchema,
	decisionRequestWireSchema,
	decisionResponseSpecSchema,
} from "../packages/ai/src/schemas";
import {
	extractionRequestSpecSchema,
	extractionResponseSpecSchema,
	vocabularyDetailSpecSchema,
	vocabularyRefListSpecSchema,
} from "../packages/ai/src/extractions";

export const AI_OPENAPI_PATH = fileURLToPath(
	new URL("../contracts/openapi/ai.openapi.json", import.meta.url),
);

/** Extraction routes the SDK calls, and the schemas they use. */
export const EXTRACTION_PATHS = [
	"/ai/extractions",
	"/ai/extractions/vocabularies",
	"/ai/extractions/vocabularies/{pin}",
] as const;
export const EXTRACTION_SCHEMAS = [
	"ExtractionRequest",
	"ExtractionResponse",
	"VocabularyRefList",
	"VocabularyDetail",
	"ExtractionErrorResponse",
] as const;

/** Route prefixes this generator owns. Other routes are left untouched. */
const OWNED_PREFIXES = ["/ai/decisions", "/ai/extractions"] as const;

/** Decisions routes and schemas, as they appear in the AI spec. */
export const DECISION_PATHS = ["/ai/decisions", "/ai/decisions/models"] as const;
export const DECISION_SCHEMAS = [
	"DecisionRequest",
	"DecisionResponse",
	"DecisionModelList",
	"ErrorResponse",
] as const;

type JsonObject = Record<string, unknown>;

/** Converts a Zod schema to an OpenAPI 3.0 schema, without `$schema`. */
function toOpenApi(schema: z.ZodType, io: "input" | "output"): JsonObject {
	const json = z.toJSONSchema(schema, {
		target: "openapi-3.0",
		io,
		unrepresentable: "throw",
	}) as JsonObject;
	delete json.$schema;
	return json;
}

/** Error envelope used by every non-2xx response of the decisions routes. */
const errorResponseSpec = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
	request_id: z.string().min(1),
	fields: z
		.array(z.object({ field: z.string(), message: z.string() }))
		.optional(),
});

const jsonContent = (ref: string) => ({
	"application/json": { schema: { $ref: `#/components/schemas/${ref}` } },
});

export function buildDecisionsFragment(): JsonObject {
	return {
		paths: {
			"/ai/decisions": {
				post: {
					operationId: "aiDecide",
					tags: ["decisions"],
					x_route_class: "public-sdk",
					description:
						"Answers typed questions about a state. Keys are user data (question names and choice labels) and travel as values, not object keys.",
					requestBody: {
						required: true,
						content: jsonContent("DecisionRequest"),
					},
					responses: {
						"200": {
							description: "Answers to every question, one per name.",
							content: jsonContent("DecisionResponse"),
						},
						"400": { description: "Invalid request", content: jsonContent("ErrorResponse") },
						"401": { description: "Missing or invalid API key", content: jsonContent("ErrorResponse") },
						"402": { description: "Balance or plan does not cover the request", content: jsonContent("ErrorResponse") },
						"413": { description: "Request body too large", content: jsonContent("ErrorResponse") },
						"422": { description: "Unknown model or unsupported question", content: jsonContent("ErrorResponse") },
						"429": { description: "Rate limited; honor Retry-After", content: jsonContent("ErrorResponse") },
						"500": { description: "Server error", content: jsonContent("ErrorResponse") },
					},
				},
			},
			"/ai/decisions/models": {
				get: {
					operationId: "aiDecisionModels",
					tags: ["decisions"],
					x_route_class: "public-sdk",
					description: "Lists the decision models the account can use.",
					responses: {
						"200": {
							description: "Decision models.",
							content: jsonContent("DecisionModelList"),
						},
						"401": { description: "Missing or invalid API key", content: jsonContent("ErrorResponse") },
						"429": { description: "Rate limited; honor Retry-After", content: jsonContent("ErrorResponse") },
						"500": { description: "Server error", content: jsonContent("ErrorResponse") },
					},
				},
			},
		},
		components: {
			schemas: {
				DecisionRequest: toOpenApi(decisionRequestWireSchema, "input"),
				DecisionResponse: toOpenApi(decisionResponseSpecSchema, "output"),
				DecisionModelList: toOpenApi(decisionModelsSpecSchema, "output"),
				ErrorResponse: toOpenApi(errorResponseSpec, "output"),
			},
		},
	};
}

/** The extraction routes the SDK calls, from the same wire schemas. */
export function buildExtractionsFragment(): {
	paths: Record<string, unknown>;
	components: { schemas: Record<string, unknown> };
} {
	const error = { "application/json": { schema: { $ref: "#/components/schemas/ExtractionErrorResponse" } } };
	const ok = (ref: string) => ({
		"application/json": { schema: { $ref: `#/components/schemas/${ref}` } },
	});
	return {
		paths: {
			"/ai/extractions": {
				post: {
					operationId: "createExtraction",
					tags: ["inference"],
					x_route_class: "public-sdk",
					description:
						"Extracts intent and entities from `input` against a pinned vocabulary. Requires an Idempotency-Key header.",
					parameters: [
						{
							name: "Idempotency-Key",
							in: "header",
							required: true,
							schema: { type: "string", minLength: 1, maxLength: 255 },
							description: "Reused on retries of the same call, so a retried request is not charged twice.",
						},
					],
					requestBody: {
						required: true,
						content: ok("ExtractionRequest"),
					},
					responses: {
						"200": {
							description: "The validated extraction.",
							content: ok("ExtractionResponse"),
						},
						"400": { description: "invalid_input, unknown_vocabulary or vocabulary_mismatch", content: error },
						"403": { description: "model_not_allowed", content: error },
						"502": { description: "extraction_failed", content: error },
						"503": { description: "extraction_unavailable", content: error },
					},
				},
			},
			"/ai/extractions/vocabularies": {
				get: {
					operationId: "listExtractionVocabularies",
					tags: ["catalog"],
					x_route_class: "public-sdk",
					description: "The vocabulary the parser currently serves.",
					responses: {
						"200": {
							description: "Served vocabularies.",
							content: ok("VocabularyRefList"),
						},
					},
				},
			},
			"/ai/extractions/vocabularies/{pin}": {
				get: {
					operationId: "getExtractionVocabulary",
					tags: ["catalog"],
					x_route_class: "public-sdk",
					description: "One vocabulary by exact pin (id@x.y.z), with its schema.",
					parameters: [
						{
							name: "pin",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: "The vocabulary and its schema.",
							content: ok("VocabularyDetail"),
						},
						"404": { description: "unknown_vocabulary", content: error },
					},
				},
			},
		},
		components: {
			schemas: {
				ExtractionRequest: toOpenApi(extractionRequestSpecSchema, "input"),
				ExtractionResponse: toOpenApi(extractionResponseSpecSchema, "output"),
				VocabularyRefList: toOpenApi(vocabularyRefListSpecSchema, "output"),
				VocabularyDetail: toOpenApi(vocabularyDetailSpecSchema, "output"),
				ExtractionErrorResponse: toOpenApi(extractionErrorSpec, "output"),
			},
		},
	};
}

/** Error envelope the gateway returns for extraction routes. */
const extractionErrorSpec = z.object({
	error: z.object({
		message: z.string(),
		type: z.string(),
		param: z.string().nullable(),
		code: z.string(),
	}),
});

/** The parts of an OpenAPI document this generator reads and writes. */
export interface OpenApiDocument {
	paths: Record<string, unknown>;
	components?: { schemas?: Record<string, unknown> };
	[key: string]: unknown;
}

/**
 * Returns `doc` with the decisions sections replaced by the current builder
 * output. Other routes and schemas are left as they are.
 */
export function applyDecisions(doc: OpenApiDocument): OpenApiDocument {
	const decisions = buildDecisionsFragment() as {
		paths: Record<string, unknown>;
		components: { schemas: Record<string, unknown> };
	};
	const extractions = buildExtractionsFragment();
	const fragment = {
		paths: { ...decisions.paths, ...extractions.paths },
		components: {
			schemas: {
				...decisions.components.schemas,
				...extractions.components.schemas,
			},
		},
	};
	const paths = Object.fromEntries(
		Object.entries(doc.paths).filter(
			([route]) => !OWNED_PREFIXES.some((prefix) => route.startsWith(prefix)),
		),
	);
	return {
		...doc,
		paths: { ...paths, ...fragment.paths },
		components: {
			...doc.components,
			schemas: {
				...doc.components?.schemas,
				...fragment.components.schemas,
			},
		},
	};
}

function main(): void {
	const current = readFileSync(AI_OPENAPI_PATH, "utf8");
	const next = `${JSON.stringify(
		applyDecisions(JSON.parse(current) as OpenApiDocument),
		null,
		2,
	)}\n`;
	if (process.argv.includes("--check")) {
		if (current !== next) {
			console.error(
				"contracts/openapi/ai.openapi.json decisions sections are stale. Run: bun run contract:decisions",
			);
			process.exit(1);
		}
		console.log("decisions sections of ai.openapi.json are up to date");
		return;
	}
	writeFileSync(AI_OPENAPI_PATH, next);
	console.log(`updated decisions sections of ${AI_OPENAPI_PATH}`);
}

if (import.meta.main) main();
