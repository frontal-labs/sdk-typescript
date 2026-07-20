import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  cancel,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import {
  exec,
  getAvailableVersions,
  tempDirName,
} from "./utils.js";

const compareVersions = (a: string, b: string) => {
  const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
  const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
  if (aMajor !== bMajor) {
    return aMajor - bMajor;
  }
  if (aMinor !== bMinor) {
    return aMinor - bMinor;
  }
  return aPatch - bPatch;
};

const createTemporaryDirectory = async (name: string) => {
  const cwd = process.cwd();
  const tempDir = join(cwd, name);

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
};

const cloneRepository = async (name: string) =>
  await exec(`git clone https://github.com/frontal-labs/sdk-typescript ${name}`);

const getFiles = async (version: string) => {
  await exec(`git checkout ${version}`);

  const response = await exec("git ls-files");
  const files = response.stdout.toString().trim().split("\n");

  return files;
};

const updateFiles = async (files: string[]) => {
  const cwd = process.cwd();
  const tempDir = join(cwd, tempDirName);

  for (const file of files) {
    const sourcePath = join(tempDir, file);
    const destPath = join(cwd, file);

    // Ensure destination directory exists
    await mkdir(dirname(destPath), { recursive: true });

    await copyFile(sourcePath, destPath);
  }
};

const deleteTemporaryDirectory = async () =>
  await rm(tempDirName, { recursive: true, force: true });

const getCurrentVersion = async (): Promise<string | undefined> => {
  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJsonContents = await readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContents) as { version?: string };

  return packageJson.version;
};

const getPackageVersion = async (packageName: string): Promise<string | undefined> => {
  const packageJsonPath = join("packages", packageName, "package.json");
  try {
    const packageJsonContents = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContents) as { version?: string };
    return packageJson.version;
  } catch {
    return undefined;
  }
};

const selectVersion = async (
  label: string,
  availableVersions: string[],
  initialValue: string | undefined
) => {
  const version = await select({
    message: `Select a version to update ${label}:`,
    options: availableVersions.map((v) => ({ value: v, label: `v${v}` })),
    initialValue,
    maxItems: 10,
  });

  if (isCancel(version)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  return version.toString();
};

const selectPackage = async (packages: string[]) => {
  const pkg = await select({
    message: "Select a package to update:",
    options: packages.map((p) => ({ value: p, label: `@frontal-labs/${p}` })),
    initialValue: packages[0],
  });

  if (isCancel(pkg)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  return pkg.toString();
};

const getDiff = async (
  from: { version: string; files: string[] },
  to: { version: string; files: string[] }
) => {
  const filesToUpdate: string[] = [];

  for (const file of to.files) {
    // Skip scripts directory and other non-SDK files
    if (file.startsWith("scripts/") || file.startsWith(".git") || file.startsWith("node_modules")) {
      continue;
    }

    const hasChanged =
      !from.files.includes(file) ||
      (
        await exec(
          `git diff ${from.version} ${to.version} -- "${file.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
          { maxBuffer: 1024 * 1024 * 1024 }
        )
      )
        .toString()
        .trim() !== "";

    if (hasChanged) {
      filesToUpdate.push(file);
    }
  }

  return filesToUpdate;
};

const updateDependencies = async (packageName?: string) => {
  if (packageName) {
    // Update specific package
    console.log(`Updating dependencies for @frontal-labs/${packageName}...`);
    await exec(`bun update @frontal-labs/${packageName}`);
  } else {
    // Update all SDK packages
    console.log("Updating all Frontal SDK packages...");
    await exec("bun update @frontal-labs/core @frontal-labs/ai @frontal-labs/workers @frontal-labs/blob");
  }
};

const checkForUpdates = async () => {
  console.log("Checking for available updates...");

  try {
    // Check for outdated packages
    await exec("bun outdated");
  } catch (error) {
    // Ignore error - unable to check for updates
  }
};

export const update = async (options: {
  package?: string;
  from?: string;
  to?: string;
  check?: boolean;
}) => {
  try {
    intro("Let's update your Frontal SDK!");

    if (options.check) {
      await checkForUpdates();
      outro("Update check completed.");
      return;
    }

    const cwd = process.cwd();
    const availableVersions = await getAvailableVersions();
    let currentVersion = await getCurrentVersion();

    // Get available packages
    const packages = ["ai", "compute", "functions", "storage", "flags", "logging", "notifications", "core"];

    let targetPackage = options.package;
    if (!targetPackage && packages.length > 1) {
      targetPackage = await selectPackage(packages);
    } else if (!targetPackage) {
      targetPackage = packages[0];
    }

    // Get current version of the specific package
    let packageVersion: string | undefined;
    if (targetPackage) {
      packageVersion = await getPackageVersion(targetPackage);
    }

    // Ditch the package version if it is not in the available versions
    if (packageVersion && !availableVersions.includes(packageVersion)) {
      packageVersion = undefined;
    }

    const fromVersion =
      options.from ||
      (await selectVersion("from", availableVersions, packageVersion || currentVersion));

    if (fromVersion === availableVersions[0]) {
      outro("You are already on the latest version!");
      return;
    }

    const upgradeableVersions = availableVersions.filter(
      (v) => compareVersions(v, fromVersion) > 0
    );

    const [nextVersion] = upgradeableVersions;

    const toVersion =
      options.to ||
      (await selectVersion("to", upgradeableVersions, nextVersion));

    const from = `v${fromVersion}`;
    const to = `v${toVersion}`;

    const s = spinner();

    s.start(`Preparing to update @frontal-labs/${targetPackage} from ${from} to ${to}...`);

    s.message("Creating temporary directory...");
    await createTemporaryDirectory(tempDirName);

    s.message("Cloning Frontal SDK...");
    await cloneRepository(tempDirName);

    s.message("Moving into repository...");
    process.chdir(tempDirName);

    s.message(`Getting files from version ${from}...`);
    const fromFiles = await getFiles(from);

    s.message(`Getting files from version ${to}...`);
    const toFiles = await getFiles(to);

    s.message(`Computing diff between versions ${from} and ${to}...`);
    const diff = await getDiff(
      {
        version: from,
        files: fromFiles,
      },
      {
        version: to,
        files: toFiles,
      }
    );

    s.message("Moving back to original directory...");
    process.chdir(cwd);

    if (diff.length > 0) {
      s.message(`Updating ${diff.length} files...`);
      await updateFiles(diff);
    }

    s.message("Updating dependencies...");
    await updateDependencies(targetPackage);

    s.message("Cleaning up...");
    await deleteTemporaryDirectory();

    s.stop(`Successfully updated @frontal-labs/${targetPackage} from ${from} to ${to}!`);

    outro("Please review and test the changes carefully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`;

    log.error(`Failed to update SDK: ${message}`);
    process.exit(1);
  }
};
