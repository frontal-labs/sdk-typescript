import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Endpoint = { method: string; path: string };
type Issue = {
	package: string;
	endpoint: Endpoint;
	resolvedMethod: string;
	surface: "api" | "ai";
	reason: "missing-in-spec" | "forbidden-surface";
};

type OpenApi = { paths?: Record<string, Record<string, unknown>> };

const ROOT = process.cwd();
const REPORT = join(ROOT, "contracts", "reports", "conformance.json");
const API_OPENAPI = join(ROOT, "contracts", "openapi", "api.openapi.json");
const AI_OPENAPI = join(
	ROOT,
	"contracts",
	"openapi",
	"ai.openapi.generated.json",
);
const OUT = join(ROOT, "contracts", "reports", "migration-matrix.md");

function openApiOps(path: string): Array<{ method: string; path: string }> {
	const doc = JSON.parse(readFileSync(path, "utf8")) as OpenApi;
	const ops: Array<{ method: string; path: string }> = [];
	for (const [p, item] of Object.entries(doc.paths ?? {})) {
		for (const m of Object.keys(item)) {
			const mm = m.toUpperCase();
			if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(mm)) {
				ops.push({ method: mm, path: p });
			}
		}
	}
	return ops;
}

function pathPrefix(path: string): string {
	const segs = path.split("/").filter(Boolean);
	return segs.slice(0, 2).join("/");
}

function suggest(
	issue: Issue,
	ops: Array<{ method: string; path: string }>,
): string {
	const methodOps = ops.filter((op) => op.method === issue.resolvedMethod);
	const prefix = pathPrefix(issue.endpoint.path);
	const byPrefix = methodOps.filter((op) => pathPrefix(op.path) === prefix);
	if (byPrefix.length > 0)
		return byPrefix
			.slice(0, 3)
			.map((v) => v.path)
			.join(", ");
	return (
		methodOps
			.slice(0, 3)
			.map((v) => v.path)
			.join(", ") || "n/a"
	);
}

function main(): void {
	if (
		!existsSync(REPORT) ||
		!existsSync(API_OPENAPI) ||
		!existsSync(AI_OPENAPI)
	) {
		throw new Error(
			"Missing conformance artifacts. Run: bun run contract:sync && bun run contract:report",
		);
	}

	const report = JSON.parse(readFileSync(REPORT, "utf8")) as {
		conformance: {
			issues: Issue[];
			summary: Record<
				string,
				{ total: number; matched: number; unmatched: number }
			>;
		};
	};
	const apiOps = openApiOps(API_OPENAPI);
	const aiOps = openApiOps(AI_OPENAPI);

	const lines: string[] = [];
	lines.push("# SDK Migration Matrix");
	lines.push("");
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push("");
	lines.push("## Summary");
	lines.push("");
	lines.push("| Package | Total | Matched | Unmatched |");
	lines.push("|---|---:|---:|---:|");
	for (const [pkg, s] of Object.entries(report.conformance.summary)) {
		lines.push(`| ${pkg} | ${s.total} | ${s.matched} | ${s.unmatched} |`);
	}

	lines.push("");
	lines.push("## Endpoint Gaps");
	lines.push("");
	lines.push(
		"| Package | SDK Endpoint | Method | Reason | Suggested Contract Paths |",
	);
	lines.push("|---|---|---|---|---|");

	for (const issue of report.conformance.issues) {
		const ops = issue.surface === "api" ? apiOps : aiOps;
		const hint = suggest(issue, ops).replace(/\|/g, "\\|");
		lines.push(
			`| ${issue.package} | ${issue.endpoint.path} | ${issue.resolvedMethod} | ${issue.reason} | ${hint} |`,
		);
	}

	writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
	console.log(`Wrote migration matrix: ${OUT}`);
}

main();
