import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

type Endpoint = { method: string; path: string };
type Contract = Record<string, Endpoint[]>;

type Surface = "api" | "ai";

type ConformanceIssue = {
	package: string;
	endpoint: Endpoint;
	resolvedMethod: string;
	surface: Surface;
	reason: "missing-in-spec" | "forbidden-surface";
};

const ROOT = process.cwd();
const SDK_CONTRACT_PATH = join(ROOT, "contracts", "sdk-endpoints.json");
const API_OPENAPI_PATH = join(ROOT, "contracts", "openapi", "api.openapi.json");
const AI_OPENAPI_PATH = join(
	ROOT,
	"contracts",
	"openapi",
	"ai.openapi.generated.json",
);
const REPORT_PATH = join(ROOT, "contracts", "reports", "conformance.json");

const PACKAGES = [
	"ai",
	"agents",
	"blob",
	"functions",
	"graph",
	"ontology",
	"pipelines",
	"workflows",
] as const;

const HTTP_METHODS = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"stream",
	"postStream",
	"getRaw",
	"postRaw",
	"putRaw",
	"postFormData",
]);

const PACKAGE_SURFACE: Record<(typeof PACKAGES)[number], Surface> = {
	ai: "ai",
	agents: "api",
	blob: "api",
	functions: "api",
	graph: "api",
	ontology: "api",
	pipelines: "api",
	workflows: "api",
};

function normalizePath(path: string): string {
	return path.replace(/\$\{[^}]+\}/g, "{param}");
}

function extractPath(arg: ts.Expression): string | null {
	if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
		return arg.text;
	}

	if (ts.isTemplateExpression(arg)) {
		let value = arg.head.text;
		for (const span of arg.templateSpans) {
			value += "{param}";
			value += span.literal.text;
		}
		return value;
	}

	return null;
}

function isThisHttpAccess(node: ts.Expression): boolean {
	if (!ts.isPropertyAccessExpression(node)) return false;
	if (!ts.isThis(node.expression)) return false;
	return node.name.text === "http";
}

function extractFromFile(filePath: string): Endpoint[] {
	const sourceText = readFileSync(filePath, "utf8");
	const source = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);

	const endpoints: Endpoint[] = [];

	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const call = node.expression;
			const method = call.name.text;

			if (HTTP_METHODS.has(method) && isThisHttpAccess(call.expression)) {
				const firstArg = node.arguments[0];
				if (firstArg) {
					const rawPath = extractPath(firstArg);
					if (rawPath && rawPath.startsWith("/")) {
						endpoints.push({
							method: method.toUpperCase(),
							path: normalizePath(rawPath),
						});
					}
				}
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(source);
	return endpoints;
}

function buildCurrentContract(): Contract {
	const contract: Contract = {};

	for (const pkg of PACKAGES) {
		const srcDir = join(ROOT, "packages", pkg, "src");
		const files = ["client.ts", "service.ts"]
			.map((name) => join(srcDir, name))
			.filter((candidate) => existsSync(candidate));

		const endpoints = files.flatMap((file) => extractFromFile(file));
		const unique = [
			...new Map(
				endpoints.map((ep) => [`${ep.method} ${ep.path}`, ep]),
			).values(),
		].sort((a, b) =>
			`${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`),
		);

		contract[pkg] = unique;
	}

	return contract;
}

function compareContracts(expected: Contract, actual: Contract): string[] {
	const errors: string[] = [];
	for (const pkg of PACKAGES) {
		const exp = new Set(
			(expected[pkg] ?? []).map((e) => `${e.method} ${e.path}`),
		);
		const got = new Set(
			(actual[pkg] ?? []).map((e) => `${e.method} ${e.path}`),
		);

		const missing = [...exp].filter((item) => !got.has(item)).sort();
		const unexpected = [...got].filter((item) => !exp.has(item)).sort();

		if (missing.length > 0 || unexpected.length > 0) {
			errors.push(`\n[${pkg}]`);
			if (missing.length > 0) {
				errors.push(`  Missing endpoints:`);
				for (const item of missing) {
					errors.push(`    - ${item}`);
				}
			}
			if (unexpected.length > 0) {
				errors.push(`  Unexpected endpoints:`);
				for (const item of unexpected) {
					errors.push(`    + ${item}`);
				}
			}
		}
	}
	return errors;
}

function resolveHttpMethod(method: string): string {
	switch (method) {
		case "STREAM":
		case "GETRAW":
			return "GET";
		case "POSTRAW":
		case "POSTFORMDATA":
		case "POSTSTREAM":
			return "POST";
		case "PUTRAW":
			return "PUT";
		default:
			return method;
	}
}

function splitSegments(path: string): string[] {
	return path.split("/").filter(Boolean);
}

function isParamSegment(value: string): boolean {
	return /^\{[^}]+\}$/.test(value);
}

function pathMatches(contractPath: string, sdkPath: string): boolean {
	const a = splitSegments(contractPath);
	const b = splitSegments(sdkPath);
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i] === b[i]) continue;
		if (isParamSegment(a[i]) || isParamSegment(b[i])) continue;
		return false;
	}
	return true;
}

function parseOpenApiOperations(
	path: string,
): Array<{ method: string; path: string }> {
	const raw = JSON.parse(readFileSync(path, "utf8")) as {
		paths?: Record<string, Record<string, unknown>>;
	};
	const operations: Array<{ method: string; path: string }> = [];
	for (const [routePath, item] of Object.entries(raw.paths ?? {})) {
		for (const method of Object.keys(item)) {
			const normalized = method.toUpperCase();
			if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalized)) {
				operations.push({ method: normalized, path: routePath });
			}
		}
	}
	return operations;
}

function buildCandidatePaths(surface: Surface, sdkPath: string): string[] {
	if (surface === "api") {
		if (sdkPath.startsWith("/v1/")) return [sdkPath];
		return [`/v1${sdkPath}`, sdkPath];
	}
	if (sdkPath.startsWith("/v1/"))
		return [sdkPath, sdkPath.replace(/^\/v1/, "")];
	return [sdkPath, `/v1${sdkPath}`];
}

function surfaceAllowsPath(surface: Surface, path: string): boolean {
	if (surface === "ai") {
		return (
			path.startsWith("/ai/") ||
			path.startsWith("/internal/") ||
			path === "/health"
		);
	}
	return !path.startsWith("/ai/") && !path.startsWith("/internal/");
}

function runConformance(contract: Contract): {
	issues: ConformanceIssue[];
	summary: Record<
		string,
		{ total: number; matched: number; unmatched: number }
	>;
} {
	if (!existsSync(API_OPENAPI_PATH)) {
		throw new Error(
			`Missing API OpenAPI contract: ${API_OPENAPI_PATH}. Run bun run contract:sync`,
		);
	}
	if (!existsSync(AI_OPENAPI_PATH)) {
		throw new Error(
			`Missing AI OpenAPI contract: ${AI_OPENAPI_PATH}. Run bun run contract:sync`,
		);
	}

	const apiOps = parseOpenApiOperations(API_OPENAPI_PATH);
	const aiOps = parseOpenApiOperations(AI_OPENAPI_PATH);

	const issues: ConformanceIssue[] = [];
	const summary: Record<
		string,
		{ total: number; matched: number; unmatched: number }
	> = {};

	for (const pkg of PACKAGES) {
		const endpoints = contract[pkg] ?? [];
		const surface = PACKAGE_SURFACE[pkg];
		const ops = surface === "api" ? apiOps : aiOps;

		let matched = 0;
		for (const endpoint of endpoints) {
			const resolvedMethod = resolveHttpMethod(endpoint.method);
			const candidates = buildCandidatePaths(surface, endpoint.path);

			if (
				!candidates.some((candidate) => surfaceAllowsPath(surface, candidate))
			) {
				issues.push({
					package: pkg,
					endpoint,
					resolvedMethod,
					surface,
					reason: "forbidden-surface",
				});
				continue;
			}

			const found = ops.some((op) => {
				if (op.method !== resolvedMethod) return false;
				return candidates.some((candidate) => pathMatches(op.path, candidate));
			});

			if (found) {
				matched += 1;
			} else {
				issues.push({
					package: pkg,
					endpoint,
					resolvedMethod,
					surface,
					reason: "missing-in-spec",
				});
			}
		}

		summary[pkg] = {
			total: endpoints.length,
			matched,
			unmatched: endpoints.length - matched,
		};
	}

	return { issues, summary };
}

function writeReport(report: unknown): void {
	mkdirSync(join(ROOT, "contracts", "reports"), { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main(): void {
	const shouldUpdate = process.argv.includes("--update");
	const reportOnly = process.argv.includes("--report-only");
	const skipSnapshot = process.argv.includes("--skip-snapshot");

	const current = buildCurrentContract();

	if (shouldUpdate) {
		mkdirSync(join(ROOT, "contracts"), { recursive: true });
		writeFileSync(
			SDK_CONTRACT_PATH,
			`${JSON.stringify(current, null, 2)}\n`,
			"utf8",
		);
		console.log(`Updated endpoint snapshot: ${SDK_CONTRACT_PATH}`);
		if (skipSnapshot) return;
	}

	if (!existsSync(SDK_CONTRACT_PATH)) {
		throw new Error(
			`Endpoint snapshot missing: ${SDK_CONTRACT_PATH}. Run bun run contract:endpoints:update`,
		);
	}

	const expected = JSON.parse(
		readFileSync(SDK_CONTRACT_PATH, "utf8"),
	) as Contract;
	const driftErrors = compareContracts(expected, current);
	const conformance = runConformance(current);

	const report = {
		generatedAt: new Date().toISOString(),
		drift: {
			errors: driftErrors,
			hasDrift: driftErrors.length > 0,
		},
		conformance,
	};
	writeReport(report);
	console.log(`Wrote conformance report: ${REPORT_PATH}`);

	if (driftErrors.length > 0) {
		console.error("Endpoint snapshot drift detected:");
		console.error(driftErrors.join("\n"));
		if (!reportOnly) {
			process.exit(1);
		}
	}

	if (conformance.issues.length > 0) {
		console.error("OpenAPI conformance issues detected:");
		for (const issue of conformance.issues.slice(0, 40)) {
			console.error(
				`- [${issue.package}] ${issue.endpoint.method} ${issue.endpoint.path} -> ${issue.reason} (${issue.surface})`,
			);
		}
		if (conformance.issues.length > 40) {
			console.error(
				`...and ${conformance.issues.length - 40} more (see report)`,
			);
		}
		if (!reportOnly) {
			process.exit(1);
		}
		return;
	}

	console.log("Endpoint contract and OpenAPI conformance checks passed.");
}

main();
