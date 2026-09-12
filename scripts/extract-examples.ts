/**
 * Extracts fenced TypeScript blocks from README/guide markdown into
 * `.examples-build/` so they can be type-checked (and, for the canonical
 * quickstart, executed against mocks) in CI.
 *
 * Block rules:
 *   ```ts            → extracted
 *   ```typescript    → extracted
 *   ```ts skip       → ignored (add a `// TODO(example): reason` line)
 *   ```ts prelude    → extracted AND prepended to every later block in the
 *                      same file (use for a guide's one-time setup)
 *   ```ts title=x    → any other info tokens are ignored
 *
 * Each block becomes one module: `import` lines are hoisted, the remainder is
 * wrapped in `export async function example()` so top-level `await` works.
 *
 * Usage: bun scripts/extract-examples.ts [--out .examples-build]
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

export interface ExtractedExample {
  /** Source markdown path (repo-relative). */
  source: string;
  /** 1-based line of the opening fence. */
  line: number;
  /** Generated file path (repo-relative). */
  file: string;
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/** Markdown files whose ```ts blocks are contract-checked. */
export function exampleSources(root = ROOT): string[] {
  const files = [
    "README.md",
    "examples/SDKS_GUIDE.md",
    "SKILL.md",
    "docs/TESTING.md",
  ];
  for (const t of readdirSync(join(root, "templates"), {
    withFileTypes: true,
  })) {
    if (t.isDirectory()) files.push(`templates/${t.name}/README.md`);
  }
  for (const pkg of readdirSync(join(root, "packages"))) {
    files.push(`packages/${pkg}/README.md`);
  }
  return files.filter((f) => {
    try {
      readFileSync(join(root, f));
      return true;
    } catch {
      return false;
    }
  });
}

interface Block {
  line: number;
  code: string;
  prelude?: boolean;
}

const FENCE = /^```(\w+)?([^\n]*)$/;

export function extractBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let open:
    | { line: number; keep: boolean; prelude: boolean; buf: string[] }
    | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (open) {
      if (line.trim() === "```") {
        if (open.keep) {
          blocks.push({
            line: open.line,
            code: open.buf.join("\n"),
            prelude: open.prelude,
          });
        }
        open = undefined;
      } else {
        open.buf.push(line);
      }
      continue;
    }
    const m = FENCE.exec(line.trim());
    if (!m) continue;
    const lang = (m[1] ?? "").toLowerCase();
    const info = (m[2] ?? "").trim().split(/\s+/);
    const isTs = lang === "ts" || lang === "typescript" || lang === "tsx";
    open = {
      line: i + 1,
      keep: isTs && !info.includes("skip"),
      prelude: info.includes("prelude"),
      buf: [],
    };
  }
  return blocks;
}

/** Split a block into hoisted imports and the body. */
function splitImports(code: string): { imports: string[]; body: string[] } {
  const imports: string[] = [];
  const body: string[] = [];
  const lines = code.split("\n");
  let i = 0;
  while (i < lines.length) {
    const l = lines[i] ?? "";
    if (/^\s*import\b/.test(l)) {
      // multi-line import: collect until the line containing `from` or `;`
      const chunk = [l];
      while (
        !(
          /from\s+["'][^"']+["'];?\s*$/.test(chunk.at(-1) ?? "") ||
          /^\s*import\s+["'][^"']+["'];?\s*$/.test(chunk.at(-1) ?? "")
        ) &&
        i + 1 < lines.length
      ) {
        i++;
        chunk.push(lines[i] ?? "");
      }
      imports.push(chunk.join("\n"));
    } else if (/^\s*"use client";?\s*$/.test(l)) {
      // ignore directives
    } else {
      body.push(l);
    }
    i++;
  }
  return { imports, body };
}

const NAMED_IMPORT =
  /^\s*import\s*(type\s+)?\{([^}]*)\}\s*from\s*(["'][^"']+["']);?\s*$/s;

/** Merge `import { a } from "x"` + `import { b } from "x"` into one line. */
export function mergeImports(imports: string[]): string[] {
  const named = new Map<string, Set<string>>();
  const passthrough: string[] = [];
  for (const imp of imports) {
    const m = NAMED_IMPORT.exec(imp);
    if (!m) {
      if (!passthrough.includes(imp)) passthrough.push(imp);
      continue;
    }
    const key = `${m[1] ? "type " : ""}${m[3]}`;
    const set = named.get(key) ?? new Set<string>();
    for (const spec of (m[2] ?? "").split(",")) {
      const t = spec.trim();
      if (t) set.add(t);
    }
    named.set(key, set);
  }
  const merged = [...named.entries()].map(([key, set]) => {
    const isType = key.startsWith("type ");
    const mod = isType ? key.slice(5) : key;
    return `import ${isType ? "type " : ""}{ ${[...set].join(", ")} } from ${mod};`;
  });
  return [...passthrough, ...merged];
}

export function toModule(code: string, header: string, prelude = ""): string {
  const { imports, body } = splitImports(code);
  const isTsx = /<[A-Za-z][^>]*>/.test(code) && /return\s*\(/.test(code);
  const indent = (lines: string[], depth: number): string =>
    lines.map((l) => (l ? `${"  ".repeat(depth)}${l}` : l)).join("\n");
  const isModule =
    /^\s*export\s+(default|const|let|async|function|class|interface|type|enum)\b/m.test(
      code
    );
  let wrapped: string;
  if (isTsx || isModule) {
    // Already module-shaped (config files, components): emit as-is.
    wrapped = body.join("\n");
  } else if (prelude) {
    // Prelude lives in the outer scope; the block gets its own nested scope
    // so it may legally redeclare names the prelude introduced.
    const { imports: pImports, body: pBody } = splitImports(prelude);
    imports.splice(
      0,
      imports.length,
      ...mergeImports([...pImports, ...imports])
    );
    wrapped = `export async function example(): Promise<void> {\n${indent(pBody, 1)}\n  {\n${indent(body, 2)}\n  }\n}`;
  } else {
    wrapped = `export async function example(): Promise<void> {\n${indent(body, 1)}\n}`;
  }
  return `${header}\n${imports.join("\n")}\n\n${wrapped}\n`;
}

export function extractExamples(
  opts: { root?: string; out?: string } = {}
): ExtractedExample[] {
  const root = opts.root ?? ROOT;
  const outDir = join(root, opts.out ?? ".examples-build");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const result: ExtractedExample[] = [];
  for (const source of exampleSources(root)) {
    const md = readFileSync(join(root, source), "utf8");
    const blocks = extractBlocks(md);
    if (blocks.length === 0) continue;
    const slug = source.replace(/\.md$/, "").replace(/[/\\]/g, "__");
    mkdirSync(join(outDir, slug), { recursive: true });
    let prelude = "";
    blocks.forEach((b, n) => {
      const usesJsx =
        /<[A-Za-z][^>]*>/.test(b.code) && /return\s*\(/.test(b.code);
      const file = join(
        outDir,
        slug,
        `${String(n + 1).padStart(2, "0")}.${usesJsx ? "tsx" : "ts"}`
      );
      const header = `// Generated from ${source}:${b.line} — do not edit. Run \`bun scripts/extract-examples.ts\`.`;
      writeFileSync(file, toModule(b.code, header, b.prelude ? "" : prelude));
      if (b.prelude) prelude += `${b.code}\n`;
      result.push({ source, line: b.line, file: relative(root, file) });
    });
  }
  writeFileSync(
    join(outDir, "manifest.json"),
    `${JSON.stringify(result, null, 2)}\n`
  );
  return result;
}

if (import.meta.main) {
  const outIdx = process.argv.indexOf("--out");
  const out = outIdx > -1 ? process.argv[outIdx + 1] : undefined;
  const examples = extractExamples({ out });
  console.log(
    `Extracted ${examples.length} example(s) into ${out ?? ".examples-build"}/`
  );
}
