#!/usr/bin/env bun

import { program } from "commander";
import { initialize } from "./initialize.js";
import { update } from "./update.js";
import { exec } from "./utils.js";

program
  .name("frontal-sdk")
  .description("Frontal SDK CLI - Manage your SDK development environment")
  .version("0.0.0");

program
  .command("init")
  .description("Initialize a new Frontal SDK package or workspace")
  .option("--name <name>", "Name of the package or workspace")
  .option("--type <type>", "Type of package to create (core, ai, compute, functions, storage, flags, logging, notifications)")
  .option("--workspace", "Create a new workspace with multiple packages")
  .option("--package-manager <manager>", "Package manager to use (bun, npm, yarn, pnpm)")
  .option("--disable-git", "Disable git initialization")
  .action(initialize);

program
  .command("update")
  .description("Update SDK packages and dependencies")
  .option("--package <package>", "Update specific package (updates all if not specified)")
  .option("--from <version>", "Version to update from")
  .option("--to <version>", "Version to update to")
  .option("--check", "Only check for available updates")
  .action(update);

program
  .command("build")
  .description("Build all SDK packages or specific package")
  .option("--package <package>", "Build specific package")
  .option("--watch", "Enable watch mode")
  .action(async (options: { package?: string; watch?: boolean }) => {
    const command = options.package
      ? `bun run build --filter=${options.package}`
      : "bun run build";
    await exec(command);
  });

program
  .command("test")
  .description("Run tests for SDK packages")
  .option("--package <package>", "Test specific package")
  .option("--coverage", "Generate coverage report")
  .option("--watch", "Enable watch mode")
  .action(async (options: { package?: string; coverage?: boolean; watch?: boolean }) => {
    let command = "bun run test";
    if (options.package) command += ` --filter=${options.package}`;
    if (options.coverage) command += " --coverage";
    if (options.watch) command += ":watch";
    await exec(command);
  });

program.parse(process.argv);
