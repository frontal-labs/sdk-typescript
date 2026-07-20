#!/usr/bin/env bun
/**
 * Publishes packages to the GitHub Packages npm registry
 * (https://npm.pkg.github.com/).
 *
 * Expected environment variables (set by publish.yml):
 *   GITHUB_TOKEN        — the built-in GitHub Actions token
 *   PUBLISHED_PACKAGES  — JSON array from changesets/action output,
 *                          e.g. [{"name":"@frontal-labs/core","version":"1.0.1"}]
 *
 * Uses CLI flags to override the scope registry so the per-package .npmrc
 * files (which point to npmjs.org) do not need to be touched.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

interface PublishedPackage {
  name: string;
  version: string;
}

function main(): void {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Fatal: GITHUB_TOKEN is required");
    process.exit(1);
  }

  const raw = process.env.PUBLISHED_PACKAGES;
  if (!raw || raw === "[]") {
    console.log("No PUBLISHED_PACKAGES to publish, skipping GitHub Packages");
    process.exit(0);
  }

  let allPackages: unknown;
  try {
    allPackages = JSON.parse(raw);
  } catch {
    console.error("Fatal: PUBLISHED_PACKAGES is not valid JSON");
    process.exit(1);
  }

  if (!Array.isArray(allPackages)) {
    console.error("Fatal: PUBLISHED_PACKAGES is not an array");
    process.exit(1);
  }

  const packages = (allPackages as PublishedPackage[]).filter((p) =>
    typeof p.name === "string" && p.name.startsWith("@frontal-labs/")
  );

  if (packages.length === 0) {
    console.log("No @frontal-labs packages to publish to GitHub Packages");
    process.exit(0);
  }

  console.log(
    `Publishing ${packages.length} package(s) to GitHub Packages…\n`
  );

  let failures = 0;

  for (const pkg of packages) {
    const shortName = pkg.name.replace("@frontal-labs/", "");
    const dir = resolve(import.meta.dirname, "..", "packages", shortName);

    if (!existsSync(dir)) {
      console.error(
        `FAIL: directory not found for ${pkg.name} (expected: ${dir})`
      );
      failures++;
      continue;
    }

    console.log(`Publishing ${pkg.name}@${pkg.version}…`);

    const result = spawnSync(
      "npm",
      [
        "publish",
        "--no-provenance",
        `--registry=https://npm.pkg.github.com/`,
        `--@frontal-labs:registry=https://npm.pkg.github.com/`,
        `--//npm.pkg.github.com/:_authToken=${token}`,
        "--access=public",
      ],
      { cwd: dir, stdio: "pipe" }
    );

    if (result.error) {
      console.error(
        `FAIL: ${pkg.name}@${pkg.version} — failed to spawn npm: ${result.error.message}`
      );
      failures++;
      continue;
    }

    const stderr = result.stderr?.toString() ?? "";
    const stdout = result.stdout?.toString() ?? "";
    const output = stderr + stdout;

    if (result.status === 0) {
      console.log(
        `OK: ${pkg.name}@${pkg.version} published to GitHub Packages`
      );
    } else if (
      output.includes("already exists") ||
      output.includes("409")
    ) {
      console.log(
        `SKIP: ${pkg.name}@${pkg.version} already exists on GitHub Packages`
      );
    } else {
      console.error(
        `FAIL: ${pkg.name}@${pkg.version} (exit code ${result.status ?? "null"})`
      );
      if (stderr) console.error(stderr);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(
      `\n${failures} package(s) failed to publish to GitHub Packages`
    );
    process.exit(1);
  }

  console.log(
    `\nPublished ${packages.length} package(s) to GitHub Packages successfully`
  );
}

main();
