/**
 * Generates the agent-readable docs manifest from the READMEs:
 *
 *   docs/mcp.json   — manifest of docs (path, title, summary) + headline
 *                     operations for MCP servers and agent tooling. No server
 *                     code lives here; `SKILL.md` is the human/agent entry point.
 *
 * Usage:
 *   bun scripts/generate-docs-manifest.ts          # write the manifest
 *   bun scripts/generate-docs-manifest.ts --check  # exit 1 if it is stale
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const SDK_PKG = "@frontal-labs/sdk";
const REPO = "https://github.com/frontal-labs/sdk-typescript";

/** Reading order: entry points first, then services, then reference. */
const SERVICE_ORDER = [
  "ai",
  "agents",
  "workflows",
  "pipelines",
  "graph",
  "ontology",
  "blob",
  "datasets",
  "data",
  "lineage",
  "observability",
  "audit",
  "governance",
  "auth",
  "billing",
  "events",
  "webhooks",
  "schedules",
  "workers",
  "sandbox",
  "connectors",
  "integrations",
];

/** Headline operations exposed to MCP/agent tooling. */
const TOOLS = [
  { name: "ai.generateText", pkg: "ai", docs: "packages/ai/README.md" },
  { name: "ai.streamText", pkg: "ai", docs: "packages/ai/README.md" },
  { name: "agents.define", pkg: "agents", docs: "packages/agents/README.md" },
  {
    name: "agents.use(id).message",
    pkg: "agents",
    docs: "packages/agents/README.md",
  },
  {
    name: "agents.use(id).watch",
    pkg: "agents",
    docs: "packages/agents/README.md",
  },
  {
    name: "workflows.define",
    pkg: "workflows",
    docs: "packages/workflows/README.md",
  },
  {
    name: "workflows.approvals.approve",
    pkg: "workflows",
    docs: "packages/workflows/README.md",
  },
  {
    name: "pipelines.define",
    pkg: "pipelines",
    docs: "packages/pipelines/README.md",
  },
  { name: "graph.query", pkg: "graph", docs: "packages/graph/README.md" },
  { name: "blob.upload", pkg: "blob", docs: "packages/blob/README.md" },
  { name: "blob.getSignedUrl", pkg: "blob", docs: "packages/blob/README.md" },
  {
    name: "observability.logs.query",
    pkg: "observability",
    docs: "packages/observability/README.md",
  },
];

interface Doc {
  path: string;
  title: string;
  summary: string;
  body: string;
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");
}

/** First H1 and the first prose paragraph after it. */
function describe(path: string): Doc {
  const body = read(path);
  const lines = body.split("\n");
  const h1 = lines.find((l) => l.startsWith("# "));
  const title = h1 ? h1.slice(2).trim() : path;
  const start = h1 ? lines.indexOf(h1) + 1 : 0;
  const para: string[] = [];
  for (const line of lines.slice(start)) {
    if (
      line.startsWith("#") ||
      line.startsWith("```") ||
      line.startsWith("<")
    ) {
      if (para.length) break;
      continue;
    }
    if (line.trim() === "") {
      if (para.length) break;
      continue;
    }
    para.push(line.trim());
  }
  return { path, title, summary: para.join(" "), body };
}

function docsInOrder(): Doc[] {
  const paths = [
    "packages/sdk/README.md",
    "SKILL.md",
    "packages/core/README.md",
  ];
  const packages = readdirSync(join(ROOT, "packages"));
  for (const s of SERVICE_ORDER) {
    if (packages.includes(s)) paths.push(`packages/${s}/README.md`);
  }
  for (const p of packages) {
    const path = `packages/${p}/README.md`;
    if (!paths.includes(path) && p !== "testing") paths.push(path);
  }
  paths.push(
    "packages/testing/README.md",
    "docs/TESTING.md",
    "examples/SDKS_GUIDE.md"
  );
  return paths.filter((p) => existsSync(join(ROOT, p))).map(describe);
}

function version(): string {
  const pkg = JSON.parse(read("packages/sdk/package.json")) as {
    version: string;
  };
  return pkg.version;
}

function renderManifest(docs: Doc[]): string {
  const manifest = {
    $schema: "https://frontal.dev/schemas/mcp-manifest.v1.json",
    name: "frontal-sdk",
    version: version(),
    description:
      "Docs and headline operations of the Frontal TypeScript SDK, for MCP servers and agent tooling.",
    install: `bun add ${SDK_PKG}`,
    entry: {
      import: SDK_PKG,
      symbol: "Frontal",
      init: "new Frontal({ apiKey })",
    },
    openapi: "contracts/openapi/api.openapi.json",
    skill: "SKILL.md",
    docs: docs.map((d) => ({
      id: d.path.replace(/\W+/g, "-").replace(/^-|-$/g, ""),
      path: d.path,
      title: d.title,
      summary: d.summary,
    })),
    tools: TOOLS.map((t) => ({
      ...t,
      package: `@frontal-labs/${t.pkg}`,
      pkg: undefined,
    })),
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function main(): void {
  const check = process.argv.includes("--check");
  const docs = docsInOrder();
  const outputs: Record<string, string> = {
    "docs/mcp.json": renderManifest(docs),
  };

  const stale: string[] = [];
  for (const [path, content] of Object.entries(outputs)) {
    const abs = join(ROOT, path);
    if (check) {
      const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
      if (current !== content) stale.push(path);
    } else {
      writeFileSync(abs, content);
      console.log(`wrote ${path} (${content.length.toLocaleString()} chars)`);
    }
  }

  if (check && stale.length) {
    console.error(
      `Stale generated docs: ${stale.join(", ")}\nRun \`bun run docs:manifest\` and commit the result.`
    );
    process.exit(1);
  }
  if (check) console.log("docs manifest is up to date");
}

main();
