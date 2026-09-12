/**
 * Docs-as-tests: every ```ts block in the READMEs and SDKS_GUIDE.md must
 * type-check against the current source. Tag a block ```ts skip (with a
 * `// TODO(example): reason` line) to exclude it — visibly.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractExamples } from "../../scripts/extract-examples";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

describe("README examples", () => {
  const examples = extractExamples({ root });

  it("extracts at least the sdk quickstart", () => {
    expect(examples.some((e) => e.source === "packages/sdk/README.md")).toBe(
      true
    );
  });

  it("type-check against current sources", { timeout: 120_000 }, () => {
    const tsc = require.resolve("typescript/bin/tsc");
    const res = spawnSync(
      process.execPath,
      [
        tsc,
        "-p",
        join(root, "tests/examples/tsconfig.json"),
        "--pretty",
        "false",
      ],
      { cwd: root, encoding: "utf8" }
    );
    if (res.status !== 0) {
      const manifest = JSON.parse(
        readFileSync(join(root, ".examples-build/manifest.json"), "utf8")
      ) as Array<{ source: string; line: number; file: string }>;
      // Map generated-file diagnostics back to the markdown source.
      const annotated = res.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const hit = manifest.find((m) => line.includes(m.file));
          return hit ? `${line}\n    ↳ ${hit.source}:${hit.line}` : line;
        })
        .join("\n");
      throw new Error(`Example type-check failed:\n${annotated}`);
    }
    expect(res.status).toBe(0);
  });

  it("every skipped block carries a TODO(example) note", () => {
    const sources = [...new Set(examples.map((e) => e.source))];
    const md = [
      "README.md",
      "examples/SDKS_GUIDE.md",
      "docs/TESTING.md",
      ...sources,
    ]
      .filter((f) => existsSync(join(root, f)))
      .map((f) => [f, readFileSync(join(root, f), "utf8")] as const);
    const offenders: string[] = [];
    for (const [file, text] of md) {
      const lines = text.split("\n");
      lines.forEach((l, i) => {
        if (/^```(ts|typescript|tsx)\b.*\bskip\b/.test(l.trim())) {
          const next = lines.slice(i + 1, i + 3).join("\n");
          if (!/TODO\(example\)/.test(next)) offenders.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
