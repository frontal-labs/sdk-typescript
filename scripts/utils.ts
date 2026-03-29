import { type ExecSyncOptions, exec as execRaw } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

export const execSyncOpts: ExecSyncOptions = { stdio: "ignore" };

export const exec = promisify(execRaw);

export const supportedPackageManagers = ["bun", "npm", "yarn", "pnpm"] as const;

export const sdkPackageTypes = [
  "core",
  "ai",
  "compute",
  "functions",
  "storage",
  "flags",
  "logging",
  "notifications"
] as const;

export const tempDirName = "frontal-sdk-update";

export const semver = /^\d+\.\d+\.\d+$/;

export const getAvailableVersions = async (): Promise<string[]> => {
  try {
    const changelog = await readFile("CHANGELOG.md", "utf-8");
    const versionRegex = /# v(\d+\.\d+\.\d+)/g;
    const matches = Array.from(changelog.matchAll(versionRegex));

    return matches
      .map((match) => match[1])
      .sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
        const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
        if (aMajor !== bMajor) {
          return bMajor - aMajor;
        }
        if (aMinor !== bMinor) {
          return bMinor - aMinor;
        }
        return bPatch - aPatch;
      });
  } catch {
    // If CHANGELOG.md doesn't exist, return empty array
    return [];
  }
};

export const getPackageList = (): string[] => {
  return [
    "core",
    "ai",
    "compute",
    "functions",
    "storage",
    "flags",
    "logging",
    "notifications"
  ];
};

export const validatePackageName = (name: string): boolean => {
  return /^[a-z0-9-]+$/.test(name) && name.length > 0;
};

export const validateVersion = (version: string): boolean => {
  return semver.test(version);
};

export const formatPackageName = (name: string): string => {
  return `@frontal/${name}`;
};

export const getSdkPackageInfo = (packageName: string) => {
  const packages: Record<string, { description: string; category: string }> = {
    core: { description: "Core utilities and types for the SDK", category: "core" },
    ai: { description: "AI model interactions and inference", category: "ai" },
    compute: { description: "Distributed compute tasks", category: "compute" },
    functions: { description: "Serverless functions orchestration", category: "functions" },
    storage: { description: "Storage provider abstraction", category: "storage" },
    flags: { description: "Feature flags and configuration", category: "flags" },
    logging: { description: "Structured logging utilities", category: "logging" },
    notifications: { description: "Notification delivery and management", category: "notifications" }
  };

  return packages[packageName];
};
