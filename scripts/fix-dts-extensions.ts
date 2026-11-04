/**
 * Adds explicit `.js` extensions to relative specifiers in emitted `.d.ts`
 * files, so the declarations resolve under `moduleResolution: NodeNext`.
 *
 * `tsc --emitDeclarationOnly` keeps extensionless paths such as
 * `from "./config"`, which NodeNext rejects. Without the extension, a NodeNext
 * consumer's `new Frontal()` silently types as `any` (with `skipLibCheck`) or
 * fails to compile.
 *
 * A specifier is rewritten only when it resolves to an emitted declaration
 * file: `./x` becomes `./x.js` when `x.d.ts` exists, and `./x` becomes
 * `./x/index.js` when `x/index.d.ts` exists. Anything else is left unchanged,
 * so the script is a no-op for files without relative imports.
 *
 * Usage: bun scripts/fix-dts-extensions.ts <dist-dir>
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Matches the module specifier of `from "x"`, `import("x")`, `import "x"`
 * and `export * from "x"` forms. Group 2 is the quote, group 3 the path.
 */
const SPECIFIER =
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.\.?\/[^"']+)\2/g;

/** Specifiers that already name a file with an extension are left alone. */
const HAS_EXTENSION = /\.(?:[cm]?js|json|d\.ts)$/;

/**
 * Returns `source` with extensionless relative specifiers completed. `fileDir`
 * is the directory of the declaration file, and `exists` checks the disk.
 */
export function addJsExtensions(
  source: string,
  fileDir: string,
  exists: (path: string) => boolean = existsSync
): string {
  return source.replace(
    SPECIFIER,
    (match, keyword: string, quote: string, specifier: string) => {
      if (HAS_EXTENSION.test(specifier)) {
        return match;
      }
      const target = resolve(fileDir, specifier);
      if (exists(`${target}.d.ts`)) {
        return `${keyword}${quote}${specifier}.js${quote}`;
      }
      if (exists(join(target, "index.d.ts"))) {
        return `${keyword}${quote}${specifier.replace(/\/$/, "")}/index.js${quote}`;
      }
      return match;
    }
  );
}

/** Lists every `.d.ts` file under `dir`, recursively. */
export function declarationFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...declarationFiles(path));
    } else if (entry.name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

/** Rewrites every declaration under `dist`. Returns the files it changed. */
export function fixDistDeclarations(dist: string): string[] {
  const changed: string[] = [];
  for (const file of declarationFiles(dist)) {
    const before = readFileSync(file, "utf-8");
    const after = addJsExtensions(before, dirname(file));
    if (after !== before) {
      writeFileSync(file, after);
      changed.push(file);
    }
  }
  return changed;
}

function main(argv: readonly string[]): void {
  const dist = argv[0];
  if (dist === undefined) {
    throw new Error("usage: bun scripts/fix-dts-extensions.ts <dist-dir>");
  }
  const changed = fixDistDeclarations(resolve(dist));
  console.log(`fix-dts-extensions: ${changed.length} declaration file(s) updated`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
