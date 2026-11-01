import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { applyDecisions } from "./generate-decisions-openapi";

type OpenApiDoc = {
	openapi: string;
	info: { title: string; version: string; description?: string };
	servers?: Array<{ url: string; description?: string }>;
	paths: Record<string, Record<string, unknown>>;
	components?: Record<string, unknown>;
};

const ROOT = process.cwd();
const API_SOURCE_URL =
	process.env.FRONTAL_OPENAPI_URL ?? "https://openapi.frontal.dev";
const API_TARGET = join(ROOT, "contracts", "openapi", "api.openapi.json");
const AI_TARGET = join(
	ROOT,
	"contracts",
	"openapi",
	"ai.openapi.json",
);
const MANIFEST_TARGET = join(ROOT, "contracts", "openapi", "manifest.json");

// Location of the private `frontal` backend monorepo (for deriving the AI
// gateway route table + infra config). Defaults to a sibling checkout
// (`../frontal`); override the repo root with FRONTAL_REPO_ROOT, or the
// individual paths with FRONTAL_GATEWAY_ROOT / FRONTAL_INFRA_ROOT. No
// machine-specific absolute path is baked in.
const FRONTAL_REPO_ROOT =
	process.env.FRONTAL_REPO_ROOT ?? join(ROOT, "..", "frontal");
const GATEWAY_ROOT =
	process.env.FRONTAL_GATEWAY_ROOT ??
	join(FRONTAL_REPO_ROOT, "inference", "backend", "gateway");
const INFRA_ROOT =
	process.env.FRONTAL_INFRA_ROOT ?? join(FRONTAL_REPO_ROOT, "infrastructure");

function sha256File(path: string): string {
	const buf = readFileSync(path);
	return createHash("sha256").update(buf).digest("hex");
}

function sha256String(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

type RuntimeRoute = { method: "GET" | "POST" | "PUT" | "DELETE"; path: string };

/**
 * Reads the runtime API's match arms, e.g.
 * `(&http::Method::POST, ["embeddings"]) => ...`, into method and /v1 path.
 * A bare identifier segment such as `provider` is a path parameter.
 */
function parseRuntimeApiRoutes(runtimeApiPath: string): RuntimeRoute[] {
	const src = readFileSync(runtimeApiPath, "utf8");
	const routes = new Map<string, RuntimeRoute>();
	const armRegex =
		/\(&http::Method::(GET|POST|PUT|DELETE|PATCH),\s*\[([^\]]*)\]\)\s*=>/g;
	let match: RegExpExecArray | null = null;
	while ((match = armRegex.exec(src)) !== null) {
		const method = match[1] as RuntimeRoute["method"];
		const segments = match[2]
			.split(",")
			.map((segment) => segment.trim())
			.filter((segment) => segment.length > 0)
			.map((segment) =>
				segment.startsWith('"')
					? segment.slice(1, -1)
					: `{${segment}}`,
			);
		const path = `/v1/${segments.join("/")}`;
		routes.set(`${method} ${path}`, { method, path });
	}
	return [...routes.values()].sort((a, b) =>
		a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
	);
}

function parseUnifiedApiRoutes(unifiedApiPath: string): string[] {
	const src = readFileSync(unifiedApiPath, "utf8");
	const routes = new Set<string>();
	const armRegex = /"([^"]+)"\s*=>\s*Ok\(Self::/g;
	let match: RegExpExecArray | null = null;
	while ((match = armRegex.exec(src)) !== null) {
		routes.add(`/v1/${match[1]}`);
	}
	return [...routes].sort();
}

function hasAiPublicHostname(): boolean {
	const candidates = [
		join(INFRA_ROOT, "services", "catalog.yaml"),
		join(INFRA_ROOT, "helm", "values", "ACTIVE_RELEASE_MATRIX.yaml"),
		join(INFRA_ROOT, "terraform", "environments", "global", "main.tf"),
	];
	for (const file of candidates) {
		if (!existsSync(file)) continue;
		const content = readFileSync(file, "utf8");
		if (content.includes("ai.frontal.dev")) {
			return true;
		}
	}
	return false;
}

function buildAiSpec(): OpenApiDoc {
	const runtimeApiPath = join(GATEWAY_ROOT, "src", "router", "runtime_api.rs");
	const unifiedApiPath = join(GATEWAY_ROOT, "src", "router", "unified_api.rs");

	if (!existsSync(runtimeApiPath) || !existsSync(unifiedApiPath)) {
		throw new Error(
			`AI gateway route files not found under ${GATEWAY_ROOT}. Set FRONTAL_GATEWAY_ROOT if needed.`,
		);
	}

	const runtimeRoutes = parseRuntimeApiRoutes(runtimeApiPath);
	const unifiedRoutes = parseUnifiedApiRoutes(unifiedApiPath);

	const paths: OpenApiDoc["paths"] = {
		"/health": {
			get: {
				operationId: "aiGatewayHealth",
				tags: ["gateway"],
				responses: { "200": { description: "Gateway health" } },
			},
		},
	};

	for (const route of unifiedRoutes) {
		paths[route] = {
			post: {
				operationId: `unified${route.replace(/[^a-zA-Z0-9]+/g, "_")}`,
				tags: ["unified-api"],
				x_route_class: "public",
				responses: { "200": { description: "Unified API response" } },
			},
		};
	}

	for (const route of runtimeRoutes) {
		// Models and rerank are SDK-facing; config and key management are not.
		const sdkFacing =
			route.path === "/v1/models" ||
			route.path === "/v1/models/defaults" ||
			route.path === "/v1/rerank" ||
			route.path === "/v1/embeddings";
		const operation = {
			operationId: `runtime_${route.method.toLowerCase()}${route.path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+$/, "")}`,
			tags: ["runtime-api"],
			x_route_class: sdkFacing ? "public-sdk" : "internal",
			responses: { "200": { description: "Runtime API response" } },
		};
		paths[route.path] = {
			...paths[route.path],
			[route.method.toLowerCase()]: operation,
		};
	}

	// SDK-owned routes (decisions, extractions, embeddings) come from the Zod
	// wire schemas via applyDecisions, so a sync never drops them.
	return applyDecisions({
		openapi: "3.0.3",
		info: {
			title: "Frontal AI Gateway Public Contract",
			version: "1.0.0-generated",
			description:
				"Generated from gateway router sources and infrastructure host topology.",
		},
		servers: [
			{ url: "https://ai.frontal.dev", description: "Global latency endpoint" },
			{ url: "https://ai.us.frontal.dev", description: "US regional endpoint" },
			{ url: "https://ai.eu.frontal.dev", description: "EU regional endpoint" },
			{ url: "https://ai.ap.frontal.dev", description: "AP regional endpoint" },
		],
		paths,
		components: {},
	});
}

async function fetchApiSpec(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(
			`Failed to fetch API spec from ${url}: ${res.status} ${res.statusText}`,
		);
	}
	const text = await res.text();
	let spec: Partial<OpenApiDoc>;
	try {
		spec = JSON.parse(text) as Partial<OpenApiDoc>;
	} catch {
		throw new Error(`OpenAPI source ${url} did not return valid JSON`);
	}
	if (
		typeof spec.openapi !== "string" ||
		!spec.info ||
		typeof spec.info.title !== "string" ||
		typeof spec.info.version !== "string" ||
		!spec.paths ||
		typeof spec.paths !== "object"
	) {
		throw new Error(`OpenAPI source ${url} is missing required fields`);
	}
	return text;
}

async function main(): Promise<void> {
	const apiSpecText = await fetchApiSpec(API_SOURCE_URL);
	const aiSpec = buildAiSpec();
	const aiSpecJson = `${JSON.stringify(aiSpec, null, 2)}\n`;
	mkdirSync(join(ROOT, "contracts", "openapi"), { recursive: true });
	writeFileSync(API_TARGET, apiSpecText, "utf8");
	writeFileSync(AI_TARGET, aiSpecJson, "utf8");

	const manifest = {
		generatedAt: new Date().toISOString(),
		sources: {
			api: {
				url: API_SOURCE_URL,
				sha256: sha256String(apiSpecText),
				targetPath: API_TARGET,
				targetSha256: sha256File(API_TARGET),
			},
			ai: {
				gatewayRoot: GATEWAY_ROOT,
				infrastructureRoot: INFRA_ROOT,
				hasAiPublicHostname: hasAiPublicHostname(),
				targetPath: AI_TARGET,
				targetSha256: sha256String(aiSpecJson),
				derivation: {
					runtimeApi: "src/router/runtime_api.rs",
					unifiedApi: "src/router/unified_api.rs",
				},
			},
		},
	};

	writeFileSync(
		MANIFEST_TARGET,
		`${JSON.stringify(manifest, null, 2)}\n`,
		"utf8",
	);

	console.log(`Synced API contract: ${API_TARGET}`);
	console.log(`Generated AI contract: ${AI_TARGET}`);
	console.log(`Wrote manifest: ${MANIFEST_TARGET}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
