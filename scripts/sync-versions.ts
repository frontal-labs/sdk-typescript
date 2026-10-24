/**
 * Keeps each package's exported version constant (`VERSION` or `SDK_VERSION`
 * in `src/constants.ts`) equal to its `package.json` version.
 *
 * Run as part of `bun run version-packages`, after `changeset version`.
 * `--check` exits non-zero when any constant is out of date, without writing.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGES_DIR = fileURLToPath(new URL("../packages", import.meta.url));
const CONSTANT_PATTERN = /export const (VERSION|SDK_VERSION) = "[^"]*";/;

export interface VersionConstant {
  packageName: string;
  file: string;
  constantName: string;
  current: string;
  expected: string;
  source: string;
}

/** Finds every version constant and the package.json version it should match. */
export function readVersionConstants(
  packagesDir: string = PACKAGES_DIR
): VersionConstant[] {
  const found: VersionConstant[] = [];
  for (const dir of readdirSync(packagesDir).sort()) {
    const pkgDir = join(packagesDir, dir);
    const file = join(pkgDir, "src", "constants.ts");
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const match = source.match(CONSTANT_PATTERN);
    if (!match) continue;
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
      name: string;
      version: string;
    };
    found.push({
      packageName: pkg.name,
      file,
      constantName: match[1] as string,
      current: (match[0].match(/"([^"]*)"/) as RegExpMatchArray)[1] as string,
      expected: pkg.version,
      source,
    });
  }
  return found;
}

/** Rewrites each stale constant to its package.json version. Returns the changed entries. */
export function syncVersionConstants(
  packagesDir: string = PACKAGES_DIR
): VersionConstant[] {
  const stale = readVersionConstants(packagesDir).filter(
    (c) => c.current !== c.expected
  );
  for (const c of stale) {
    const next = c.source.replace(
      CONSTANT_PATTERN,
      `export const ${c.constantName} = "${c.expected}";`
    );
    writeFileSync(c.file, next);
  }
  return stale;
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  if (check) {
    const stale = readVersionConstants().filter((c) => c.current !== c.expected);
    for (const c of stale) {
      console.error(
        `${c.packageName}: ${c.constantName} is "${c.current}", package.json is "${c.expected}"`
      );
    }
    if (stale.length > 0) {
      console.error("Run `bun scripts/sync-versions.ts` to update them.");
      process.exit(1);
    }
    console.log("Version constants match package.json.");
  } else {
    const changed = syncVersionConstants();
    for (const c of changed) {
      console.log(`${c.packageName}: ${c.constantName} -> "${c.expected}"`);
    }
    console.log(`Updated ${changed.length} version constant(s).`);
  }
}
