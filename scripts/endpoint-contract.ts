import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
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
// No-regression coverage floor: the minimum number of spec operations each
// surface must keep implementing. Enforced (fatal) in CI so coverage can only
// rise. Raised explicitly via `--update-floor`. We floor on covered COUNT (not
// percentage) so it is robust to spec-total churn.
const COVERAGE_FLOOR_PATH = join(ROOT, "contracts", "coverage-floor.json");

// Infrastructure packages that expose no HTTP endpoints of their own.
const NON_SERVICE_PACKAGES = new Set(["core", "sdk", "testing"]);

// Packages whose calls target the AI gateway surface rather than the REST API.
const AI_SURFACE_PACKAGES = new Set(["ai"]);

/**
 * Every publishable service package under `packages/*`, discovered at runtime
 * so new packages are covered automatically instead of being silently skipped.
 */
function discoverPackages(): string[] {
	const packagesDir = join(ROOT, "packages");
	if (!existsSync(packagesDir)) return [];
	return readdirSync(packagesDir)
		.filter((name) => {
			if (NON_SERVICE_PACKAGES.has(name)) return false;
			const src = join(packagesDir, name, "src");
			return existsSync(src) && statSync(src).isDirectory();
		})
		.sort();
}

const PACKAGES = discoverPackages();

function packageSurface(pkg: string): Surface {
	return AI_SURFACE_PACKAGES.has(pkg) ? "ai" : "api";
}

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

/** Recursively collect non-test TypeScript source files under a directory. */
function collectSourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...collectSourceFiles(full));
			continue;
		}
		if (
			entry.endsWith(".ts") &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".d.ts")
		) {
			out.push(full);
		}
	}
	return out;
}

function buildCurrentContract(): Contract {
	const contract: Contract = {};

	for (const pkg of PACKAGES) {
		const srcDir = join(ROOT, "packages", pkg, "src");
		const files = existsSync(srcDir) ? collectSourceFiles(srcDir) : [];

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

type CoverageReport = {
	surface: Surface;
	specTotal: number;
	covered: number;
	coveragePct: number;
	uncovered: Array<{ method: string; path: string }>;
};

function runConformance(contract: Contract): {
	issues: ConformanceIssue[];
	summary: Record<
		string,
		{ total: number; matched: number; unmatched: number }
	>;
	coverage: Record<Surface, CoverageReport>;
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

	// Accumulate every SDK endpoint per surface so we can measure how much of
	// the spec the SDK actually covers (the reverse of "are my calls real?").
	const sdkBySurface: Record<
		Surface,
		Array<{ method: string; candidates: string[] }>
	> = { api: [], ai: [] };

	for (const pkg of PACKAGES) {
		const endpoints = contract[pkg] ?? [];
		const surface = packageSurface(pkg);
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

			sdkBySurface[surface].push({ method: resolvedMethod, candidates });

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

	const coverage: Record<Surface, CoverageReport> = {
		api: computeCoverage("api", apiOps, sdkBySurface.api),
		ai: computeCoverage("ai", aiOps, sdkBySurface.ai),
	};

	return { issues, summary, coverage };
}

/**
 * Coverage = how much of the spec the SDK implements. A spec operation is
 * "covered" when some SDK call matches its method and path. Uncovered
 * operations are real API surface the SDK does not expose yet.
 */
function computeCoverage(
	surface: Surface,
	ops: Array<{ method: string; path: string }>,
	sdk: Array<{ method: string; candidates: string[] }>,
): CoverageReport {
	const uncovered: Array<{ method: string; path: string }> = [];
	let covered = 0;
	for (const op of ops) {
		const isCovered = sdk.some(
			(call) =>
				call.method === op.method &&
				call.candidates.some((candidate) => pathMatches(op.path, candidate)),
		);
		if (isCovered) covered += 1;
		else uncovered.push(op);
	}
	uncovered.sort((a, b) =>
		`${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`),
	);
	return {
		surface,
		specTotal: ops.length,
		covered,
		coveragePct:
			ops.length === 0 ? 100 : Math.round((covered / ops.length) * 1000) / 10,
		uncovered,
	};
}

function writeReport(report: unknown): void {
	mkdirSync(join(ROOT, "contracts", "reports"), { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

type CoverageFloor = Record<string, number>;

function readCoverageFloor(): CoverageFloor | undefined {
	if (!existsSync(COVERAGE_FLOOR_PATH)) return undefined;
	return JSON.parse(readFileSync(COVERAGE_FLOOR_PATH, "utf8")) as CoverageFloor;
}

function main(): void {
	const shouldUpdate = process.argv.includes("--update");
	const reportOnly = process.argv.includes("--report-only");
	const skipSnapshot = process.argv.includes("--skip-snapshot");
	const updateFloor = process.argv.includes("--update-floor");

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
		packages: PACKAGES,
		drift: {
			errors: driftErrors,
			hasDrift: driftErrors.length > 0,
		},
		conformance,
	};
	writeReport(report);
	console.log(`Wrote conformance report: ${REPORT_PATH}`);

	// Coverage summary — how much of each spec surface the SDK implements.
	for (const surface of ["api", "ai"] as const) {
		const cov = conformance.coverage[surface];
		console.log(
			`Coverage [${surface}]: ${cov.covered}/${cov.specTotal} spec operations (${cov.coveragePct}%), ${cov.uncovered.length} uncovered.`,
		);
	}

	// Persist / raise the no-regression floor.
	if (updateFloor) {
		const floor: CoverageFloor = {};
		for (const surface of ["api", "ai"] as const) {
			floor[surface] = conformance.coverage[surface].covered;
		}
		writeFileSync(
			COVERAGE_FLOOR_PATH,
			`${JSON.stringify(floor, null, 2)}\n`,
			"utf8",
		);
		console.log(
			`Updated coverage floor: ${COVERAGE_FLOOR_PATH} (${JSON.stringify(floor)})`,
		);
	}

	// "missing-in-spec" issues are informational: the published spec is known to
	// lag the real backend services, so an SDK call absent from the spec is not
	// necessarily wrong. "forbidden-surface" (an api package calling the AI
	// gateway or vice-versa) is always a real error.
	const forbidden = conformance.issues.filter(
		(i) => i.reason === "forbidden-surface",
	);
	const missing = conformance.issues.filter(
		(i) => i.reason === "missing-in-spec",
	);

	if (missing.length > 0) {
		console.warn(
			`\n${missing.length} SDK call(s) not found in the published spec ` +
				"(informational — the spec may lag the backend). See report.",
		);
		for (const issue of missing.slice(0, 20)) {
			console.warn(
				`  ~ [${issue.package}] ${issue.endpoint.method} ${issue.endpoint.path}`,
			);
		}
		if (missing.length > 20) {
			console.warn(`  ...and ${missing.length - 20} more (see report).`);
		}
	}

	let failed = false;

	// Enforce the no-regression coverage floor (fatal): SDK coverage of each
	// surface may only rise. This is the honest, enforceable gate — the absolute
	// count of spec operations implemented cannot drop below the committed floor.
	const floor = readCoverageFloor();
	if (floor) {
		for (const surface of ["api", "ai"] as const) {
			const cov = conformance.coverage[surface];
			const min = floor[surface] ?? 0;
			if (cov.covered < min) {
				console.error(
					`\nCoverage regression [${surface}]: ${cov.covered} spec operations covered, ` +
						`below the committed floor of ${min}. Coverage must not drop; ` +
						"raise it or update the floor intentionally with --update-floor.",
				);
				failed = true;
			}
		}
	}

	if (driftErrors.length > 0) {
		console.error("\nEndpoint snapshot drift detected:");
		console.error(driftErrors.join("\n"));
		failed = true;
	}

	if (forbidden.length > 0) {
		console.error("\nForbidden-surface conformance issues detected:");
		for (const issue of forbidden) {
			console.error(
				`- [${issue.package}] ${issue.endpoint.method} ${issue.endpoint.path} (${issue.surface})`,
			);
		}
		failed = true;
	}

	if (failed && !reportOnly) {
		process.exit(1);
	}

	if (!failed) {
		console.log("Endpoint contract and forbidden-surface checks passed.");
	}
}

main();
