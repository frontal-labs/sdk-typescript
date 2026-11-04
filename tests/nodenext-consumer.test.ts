import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Regression: the built SDK's declarations must resolve under NodeNext, and
 * `new Frontal()` must be typed (not `any`). The fixture's `@ts-expect-error`
 * lines only pass when those assignments fail, so a clean tsc run proves both.
 *
 * The fixture is copied to a temp directory and linked to the built packages
 * the way an install would link them, so the check does not depend on the
 * repository's own node_modules layout.
 */
const ROOT = join(import.meta.dirname, "..");
const FIXTURE = join(ROOT, "tests", "fixtures", "nodenext-app");
const PACKAGES = join(ROOT, "packages");
const TSC = join(ROOT, "node_modules", ".bin", "tsc");
const SDK_DIST = join(PACKAGES, "sdk", "dist", "index.d.ts");

let scratch: string | undefined;

afterEach(() => {
  if (scratch !== undefined) {
    rmSync(scratch, { force: true, recursive: true });
    scratch = undefined;
  }
});

/** Copies the fixture and links every workspace package under node_modules. */
function linkedFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "nodenext-consumer-"));
  cpSync(FIXTURE, dir, { recursive: true });
  const scope = join(dir, "node_modules", "@frontal-labs");
  mkdirSync(scope, { recursive: true });
  for (const name of readdirSync(PACKAGES)) {
    symlinkSync(join(PACKAGES, name), join(scope, name), "dir");
  }
  const types = join(dir, "node_modules", "@types");
  mkdirSync(types, { recursive: true });
  symlinkSync(
    join(ROOT, "node_modules", "@types", "node"),
    join(types, "node"),
    "dir"
  );
  return dir;
}

describe.skipIf(!existsSync(SDK_DIST))(
  "NodeNext consumer of the built SDK",
  () => {
    it("compiles with typed new Frontal() and no declaration errors", () => {
      scratch = linkedFixture();
      const output = execFileSync(TSC, ["-p", join(scratch, "tsconfig.json")], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect(output).toBe("");
    }, 120_000);
  }
);
