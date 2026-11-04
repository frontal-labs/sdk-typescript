import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addJsExtensions,
  fixDistDeclarations,
} from "../scripts/fix-dts-extensions";

const DIR = "/dist/pkg";

/** Fake disk: the declaration files that exist. */
function disk(...files: string[]): (path: string) => boolean {
  const set = new Set(files);
  return (path) => set.has(path);
}

describe("addJsExtensions", () => {
  it("adds .js to a relative file import", () => {
    const out = addJsExtensions(
      'export { X } from "./config";',
      DIR,
      disk(`${DIR}/config.d.ts`)
    );
    expect(out).toBe('export { X } from "./config.js";');
  });

  it("points a directory import at its index", () => {
    const out = addJsExtensions(
      'import type { Y } from "./models";',
      DIR,
      disk(`${DIR}/models/index.d.ts`)
    );
    expect(out).toBe('import type { Y } from "./models/index.js";');
  });

  it("handles parent-relative specifiers and dynamic imports", () => {
    const source = 'type T = import("../core/errors").E;';
    const out = addJsExtensions(
      source,
      `${DIR}/nested`,
      disk("/dist/pkg/core/errors.d.ts")
    );
    expect(out).toBe('type T = import("../core/errors.js").E;');
  });

  it("leaves specifiers that already have an extension", () => {
    const source = 'export * from "./config.js";';
    expect(addJsExtensions(source, DIR, disk(`${DIR}/config.d.ts`))).toBe(
      source
    );
  });

  it("leaves package specifiers and unresolvable relative paths alone", () => {
    const source =
      'import { z } from "zod";\nexport { Q } from "./missing";';
    expect(addJsExtensions(source, DIR, disk())).toBe(source);
  });

  it("is a no-op for a file with no relative imports", () => {
    const source = 'export declare const VERSION: "1.0.0";\n';
    expect(addJsExtensions(source, DIR, disk())).toBe(source);
  });
});

describe("fixDistDeclarations", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root !== undefined) {
      rmSync(root, { force: true, recursive: true });
      root = undefined;
    }
  });

  it("rewrites nested declarations in place and reports what changed", () => {
    root = mkdtempSync(join(tmpdir(), "fix-dts-"));
    const dist = join(root, "dist");
    mkdirSync(join(dist, "nested"), { recursive: true });
    writeFileSync(join(dist, "config.d.ts"), "export interface C {}\n");
    writeFileSync(
      join(dist, "index.d.ts"),
      'export { C } from "./config";\n'
    );
    writeFileSync(
      join(dist, "nested", "use.d.ts"),
      'import type { C } from "../config";\n'
    );

    const changed = fixDistDeclarations(dist);

    expect(changed.map((file) => file.replace(dist, ""))).toEqual([
      "/index.d.ts",
      "/nested/use.d.ts",
    ]);
    expect(readFileSync(join(dist, "index.d.ts"), "utf-8")).toBe(
      'export { C } from "./config.js";\n'
    );
    expect(readFileSync(join(dist, "nested", "use.d.ts"), "utf-8")).toBe(
      'import type { C } from "../config.js";\n'
    );
    expect(readFileSync(join(dist, "config.d.ts"), "utf-8")).toBe(
      "export interface C {}\n"
    );
  });

  it("is idempotent: a second run changes nothing", () => {
    root = mkdtempSync(join(tmpdir(), "fix-dts-"));
    const dist = join(root, "dist");
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, "a.d.ts"), 'export * from "./b";\n');
    writeFileSync(join(dist, "b.d.ts"), "export {};\n");

    fixDistDeclarations(dist);
    expect(fixDistDeclarations(dist)).toEqual([]);
  });
});
