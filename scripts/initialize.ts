import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  cancel,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import {
  exec,
  execSyncOpts,
  supportedPackageManagers,
  sdkPackageTypes,
} from "./utils.js";

const createPackage = async (name: string, type: string, packageManager: string) => {
  const packageDir = join("packages", name);
  await mkdir(packageDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name: `@frontal-labs/${name}`,
    version: "0.0.0",
    description: `${type} client for the Frontal SDK.`,
    keywords: [
      "javascript",
      "typescript",
      type,
      "cloud",
      "frontal",
      "frontal-labs",
      "frontal-labs"
    ],
    homepage: `https://github.com/frontal-labs/sdk-typescript/tree/master/packages/${name}`,
    bugs: "https://github.com/frontal-labs/sdk-typescript/issues",
    license: "MIT",
    author: "Frontal Labs",
    files: ["dist", "src"],
    main: "dist/index.cjs",
    module: "dist/index.mjs",
    types: "dist/index.d.cts",
    exports: {
      ".": {
        "import": {
          "types": "./dist/index.d.mts",
          "default": "./dist/index.mjs"
        },
        "require": {
          "types": "./dist/index.d.cts",
          "default": "./dist/index.cjs"
        }
      },
      "./dist/*": "./dist/*",
      "./package.json": "./package.json"
    },
    sideEffects: false,
    repository: {
      type: "git",
      url: "https://github.com/frontal-labs/sdk-typescript.git",
      directory: `packages/${name}`
    },
    scripts: {
      "build": "bun build src/index.ts --outfile ./dist/index.mjs --format esm && bun build src/index.ts --outfile ./dist/index.cjs --format cjs",
      "build:watch": "bun build src/index.ts --outfile ./dist/index.mjs --format esm --watch",
      "type-check": "tsc --noEmit",
      "test": "bun test",
      "lint": "biome lint src/ tests/",
      "clean": "rm -rf dist"
    },
    publishConfig: {
      "access": "public"
    },
    engines: {
      "bun": ">=1.3.8",
      "node": ">=18.0.0"
    },
    dependencies: {
      "@frontal-labs/core": "workspace:*",
      "tslib": "^2.8.1",
      "zod": "^4.3.6"
    },
    devDependencies: {
      "@types/bun": "^1.3.8",
      "@types/node": "^25.2.1"
    }
  };

  await writeFile(join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");

  // Create source directory structure
  const srcDir = join(packageDir, "src");
  await mkdir(srcDir, { recursive: true });

  // Create basic files
  await writeFile(join(srcDir, "index.ts"), generateIndexContent(type));
  await writeFile(join(srcDir, "types.ts"), generateTypesContent(type));
  await writeFile(join(srcDir, "client.ts"), generateClientContent(type));
  await writeFile(join(srcDir, "api.ts"), generateApiContent(type));
  await writeFile(join(srcDir, "constants.ts"), generateConstantsContent(type));
  await writeFile(join(srcDir, "error.ts"), generateErrorContent(type));
  await writeFile(join(srcDir, "keys.ts"), generateKeysContent(type));

  // Create test directory
  const testDir = join(packageDir, "tests");
  await mkdir(testDir, { recursive: true });
  await writeFile(join(testDir, `${name}.test.ts`), generateTestContent(name, type));

  // Create docs directory
  const docsDir = join(packageDir, "docs");
  await mkdir(docsDir, { recursive: true });
  await writeFile(join(docsDir, "README.md"), generateDocsContent(name, type));

  // Create README.md
  await writeFile(join(packageDir, "README.md"), generatePackageReadme(name, type));

  // Create CHANGELOG.md
  await writeFile(join(packageDir, "CHANGELOG.md"), generateChangelogContent(name));
};

const createWorkspace = async (name: string, packageManager: string) => {
  const workspaceDir = name;
  await mkdir(workspaceDir, { recursive: true });

  // Create root package.json for workspace
  const rootPackageJson = {
    name: `@frontal-labs/${name}-workspace`,
    version: "0.0.0",
    private: true,
    description: "Frontal SDK Workspace",
    workspaces: ["packages/*"],
    scripts: {
      "build": "turbo run build",
      "test": "turbo run test",
      "lint": "turbo run lint",
      "clean": "turbo run clean"
    },
    devDependencies: {
      "@frontal-labs/core": "workspace:*",
      "turbo": "^2.4.2",
      "typescript": "^5.7.3"
    },
    packageManager: `${packageManager}@1.3.8`
  };

  await writeFile(join(workspaceDir, "package.json"), JSON.stringify(rootPackageJson, null, 2) + "\n");

  // Create packages directory
  await mkdir(join(workspaceDir, "packages"), { recursive: true });

  // Create turbo.json
  const turboJson = {
    $schema: "https://turbo.build/schema.json",
    tasks: {
      build: {
        dependsOn: ["^build"],
        outputs: ["dist/**"]
      },
      test: {
        dependsOn: ["build"],
        outputs: []
      },
      lint: {
        outputs: []
      },
      clean: {
        cache: false
      }
    }
  };

  await writeFile(join(workspaceDir, "turbo.json"), JSON.stringify(turboJson, null, 2) + "\n");
};

const initializeGit = async () => {
  await exec("git init", execSyncOpts);
  await exec("git add .", execSyncOpts);
  await exec('git commit -m "✨ Initial commit"', execSyncOpts);
};

const getName = async () => {
  const value = await text({
    message: "What is your package named?",
    placeholder: "my-package",
    validate(value: string) {
      if (value.length === 0) {
        return "Please enter a package name.";
      }
      if (!/^[a-z0-9-]+$/.test(value)) {
        return "Package name must contain only lowercase letters, numbers, and hyphens.";
      }
    },
  });

  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  return value.toString();
};

const getPackageType = async () => {
  const value = await select({
    message: "Which type of package do you want to create?",
    options: sdkPackageTypes.map((type) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    })),
    initialValue: "core",
  });

  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  return value.toString();
};

const getPackageManager = async () => {
  const value = await select({
    message: "Which package manager would you like to use?",
    options: supportedPackageManagers.map((choice) => ({
      value: choice,
      label: choice,
    })),
    initialValue: "bun",
  });

  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  return value.toString() as (typeof supportedPackageManagers)[number];
};

// Template generators
const generateIndexContent = (type: string) => `export * from "./types.js";
export * from "./client.js";
export * from "./api.js";
export * from "./constants.js";
export * from "./error.js";
export * from "./keys.js";
`;

const generateTypesContent = (type: string) => `export interface ${type.charAt(0).toUpperCase() + type.slice(1)}Config {
  // Configuration options for ${type} service
}

export interface ${type.charAt(0).toUpperCase() + type.slice(1)}Response<T = any> {
  data: T;
  success: boolean;
  message?: string;
}
`;

const generateClientContent = (type: string) => `import type { ${type.charAt(0).toUpperCase() + type.slice(1)}Config } from "./types.js";

export class ${type.charAt(0).toUpperCase() + type.slice(1)}Client {
  private config: ${type.charAt(0).toUpperCase() + type.slice(1)}Config;

  constructor(config: ${type.charAt(0).toUpperCase() + type.slice(1)}Config) {
    this.config = config;
  }

  // Add your client methods here
  async exampleMethod(): Promise<void> {
    // Implementation
  }
}
`;

const generateApiContent = (type: string) => `// API endpoints and request handlers for ${type} service
export const ${type}Endpoints = {
  // Define your API endpoints here
} as const;
`;

const generateConstantsContent = (type: string) => `export const ${type.toUpperCase()}_DEFAULT_TIMEOUT = 30000;
export const ${type.toUpperCase()}_API_VERSION = "v1";

// Add other constants for ${type} service
`;

const generateErrorContent = (type: string) => `export class ${type.charAt(0).toUpperCase() + type.slice(1)}Error extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "${type.charAt(0).toUpperCase() + type.slice(1)}Error";
  }
}

export class ${type.charAt(0).toUpperCase() + type.slice(1)}ConfigError extends ${type.charAt(0).toUpperCase() + type.slice(1)}Error {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
  }
}
`;

const generateKeysContent = (type: string) => `// Environment variable keys for ${type} service
export const ${type.toUpperCase()}_API_KEY = "FRONTAL_${type.toUpperCase()}_API_KEY";
export const ${type.toUpperCase()}_BASE_URL = "FRONTAL_${type.toUpperCase()}_BASE_URL";
export const ${type.toUpperCase()}_TIMEOUT = "FRONTAL_${type.toUpperCase()}_TIMEOUT";
`;

const generateTestContent = (name: string, type: string) => `import { describe, it, expect } from "bun:test";
import { ${type.charAt(0).toUpperCase() + type.slice(1)}Client } from "../src/client.js";

describe("${name}", () => {
  it("should create client instance", () => {
    const client = new ${type.charAt(0).toUpperCase() + type.slice(1)}Client({});
    expect(client).toBeDefined();
  });

  // Add more tests here
});
`;

const generateDocsContent = (name: string, type: string) => `# ${name}

Documentation for the ${name} package.

## Usage

\`\`\`typescript
import { ${type.charAt(0).toUpperCase() + type.slice(1)}Client } from "@frontal-labs/${name}";

const client = new ${type.charAt(0).toUpperCase() + type.slice(1)}Client({
  // configuration
});
\`\`\`
`;

const generatePackageReadme = (name: string, type: string) => `# @frontal-labs/${name}

${type.charAt(0).toUpperCase() + type.slice(1)} client for the Frontal SDK.

## Installation

\`\`\`bash
bun add @frontal-labs/${name}
\`\`\`

## Usage

\`\`\`typescript
import { ${type.charAt(0).toUpperCase() + type.slice(1)}Client } from "@frontal-labs/${name}";

const client = new ${type.charAt(0).toUpperCase() + type.slice(1)}Client({
  // configuration options
});
\`\`\`

## API Reference

### ${type.charAt(0).toUpperCase() + type.slice(1)}Client

The main client class for interacting with the ${type} service.

#### Constructor

\`\`\`typescript
constructor(config: ${type.charAt(0).toUpperCase() + type.slice(1)}Config)
\`\`\`

## License

MIT
`;

const generateChangelogContent = (name: string) => `# @frontal-labs/${name}

## 0.0.0

### Added
- Initial release of ${name} package
`;

export const initialize = async (options: {
  name?: string;
  type?: string;
  workspace?: boolean;
  packageManager?: string;
  disableGit?: boolean;
}) => {
  try {
    intro("Let's create a Frontal SDK package!");

    const cwd = process.cwd();
    const name = options.name || (await getName());
    const packageManager = options.packageManager || (await getPackageManager());

    if (!supportedPackageManagers.includes(packageManager as typeof supportedPackageManagers[number])) {
      throw new Error("Invalid package manager");
    }

    const s = spinner();

    if (options.workspace) {
      s.start("Creating workspace...");
      await createWorkspace(name, packageManager);
    } else {
      const type = options.type || (await getPackageType());
      s.start(`Creating ${type} package...`);
      await createPackage(name, type, packageManager);
    }

    if (!options.disableGit) {
      s.message("Initializing Git repository...");
      await initializeGit();
    }

    s.stop("Package created successfully!");

    outro(
      `Frontal SDK package '${name}' is ready! Check the documentation to get started.`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Failed to create package: ${error}`;

    log.error(message);
    process.exit(1);
  }
};
