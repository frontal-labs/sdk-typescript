import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

type OpenApiDoc = {
	openapi: string;
	info: { title: string; version: string; description?: string };
	servers?: Array<{ url: string; description?: string }>;
	paths: Record<string, Record<string, unknown>>;
	components?: Record<string, unknown>;
};

const ROOT = process.cwd();
const API_SOURCE_URL = "https://openapi.frontal.dev";
const API_TARGET = join(ROOT, "contracts", "openapi", "api.openapi.json");
const AI_TARGET = join(
	ROOT,
	"contracts",
	"openapi",
	"ai.openapi.generated.json",
);
const MANIFEST_TARGET = join(ROOT, "contracts", "openapi", "manifest.json");

const GATEWAY_ROOT =
	process.env.FRONTAL_GATEWAY_ROOT ??
	"/Volumes/Frontal Labs IP/frontal/inference/backend/gateway";
const INFRA_ROOT =
	process.env.FRONTAL_INFRA_ROOT ??
	"/Volumes/Frontal Labs IP/frontal/infrastructure";

function sha256File(path: string): string {
	const buf = readFileSync(path);
	return createHash("sha256").update(buf).digest("hex");
}

function sha256String(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function parseRuntimeApiRoutes(runtimeApiPath: string): string[] {
	const src = readFileSync(runtimeApiPath, "utf8");
	const routes = new Set<string>();
	const matchBlock = src.match(
		/match\s+route\.as_str\(\)\s*\{([\s\S]*?)\n\s*\}/m,
	);
	if (!matchBlock) return [];

	const armRegex = /"([^"]+)"\s*=>\s*self\.handle_/g;
	let match: RegExpExecArray | null = null;
	while ((match = armRegex.exec(matchBlock[1])) !== null) {
		routes.add(`/internal/${match[1]}`);
	}
	return [...routes].sort();
}

function parseUnifiedApiRoutes(unifiedApiPath: string): string[] {
	const src = readFileSync(unifiedApiPath, "utf8");
	const routes = new Set<string>();
	const armRegex = /"([^"]+)"\s*=>\s*Ok\(Self::/g;
	let match: RegExpExecArray | null = null;
	while ((match = armRegex.exec(src)) !== null) {
		routes.add(`/ai/${match[1]}`);
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

	const internalRoutes = parseRuntimeApiRoutes(runtimeApiPath);
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

	for (const route of internalRoutes) {
		if (route === "/internal/models" || route === "/internal/models/defaults") {
			paths[route] = {
				get: {
					operationId: `runtime${route.replace(/[^a-zA-Z0-9]+/g, "_")}`,
					tags: ["runtime-api"],
					x_route_class: "public-sdk",
					responses: { "200": { description: "Runtime API response" } },
				},
			};
		} else {
			paths[route] = {
				post: {
					operationId: `runtime${route.replace(/[^a-zA-Z0-9]+/g, "_")}`,
					tags: ["runtime-api"],
					x_route_class: "internal",
					responses: { "200": { description: "Runtime API response" } },
				},
			};
		}
	}

	return {
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
	};
}

async function fetchApiSpec(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(
			`Failed to fetch API spec from ${url}: ${res.status} ${res.statusText}`,
		);
	}
	return res.text();
}

async function main(): Promise<void> {
	mkdirSync(join(ROOT, "contracts", "openapi"), { recursive: true });

	const apiSpecText = await fetchApiSpec(API_SOURCE_URL);
	writeFileSync(API_TARGET, apiSpecText, "utf8");

	const aiSpec = buildAiSpec();
	const aiSpecJson = `${JSON.stringify(aiSpec, null, 2)}\n`;
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
