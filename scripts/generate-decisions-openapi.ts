/**
 * Writes the decisions routes and schemas into `contracts/openapi/ai.openapi.json`,
 * the single AI contract. The sections are derived from the Zod wire schemas in
 * `packages/ai/src/decision-wire.ts`, so the spec cannot drift from the client.
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
} from "../packages/ai/src/decision-wire";

export const AI_OPENAPI_PATH = fileURLToPath(
	new URL("../contracts/openapi/ai.openapi.json", import.meta.url),
);

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
	const fragment = buildDecisionsFragment() as {
		paths: Record<string, unknown>;
		components: { schemas: Record<string, unknown> };
	};
	const paths = Object.fromEntries(
		Object.entries(doc.paths).filter(
			([route]) => !route.startsWith("/ai/decisions"),
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
