# Plan: Create @frontal-labs/workers Package

**Goal**: Create a new `@frontal-labs/workers` NPM package following the same structure and conventions as other Frontal SDK packages (e.g., `@frontal-labs/blob`, `@frontal-labs/agents`). The existing `packages/workers` directory will be overwritten or replaced.

**Prerequisites**: 
- You are in the repository root: `/Users/gabrielfonseca/Documents/sdk-typescript`.
- Bun is installed and used as the package manager.
- Access to write to the `packages/` directory.

## Overview of Steps

1. Prepare the workspace (remove existing workers directory if desired).
2. Create the directory structure.
3. Add configuration files (`package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.npmrc`, `.gitignore`, `.env.example`, `turbo.json`).
4. Add documentation files (`README.md`, `CHANGELOG.md`).
5. Add source files (`src/constants.ts`, `src/index.ts`, `src/service.ts`, `src/keys.ts`, `src/schemas.ts`).
6. Add a basic test file (`tests/workers.test.ts`).
7. Install dependencies.
8. Build, lint, and test to verify correctness.
9. (Optional) Generate documentation.

After the package is created and verified, you can publish it to NPM and later remove any outdated SDKs as planned.

---

## Detailed Steps

### 1. Prepare the Workspace

```bash
# From repository root
cd /Users/gabrielfonseca/Documents/sdk-typescript
# Remove existing workers directory to start clean (optional, but recommended)
rm -rf packages/workers
```

### 2. Create Directory Structure

```bash
mkdir -p packages/workers/src
mkdir -p packages/workers/tests
```

### 3. Create `package.json`

Create `packages/workers/package.json` with the following content:

```json
{
  "name": "@frontal-labs/workers",
  "version": "0.0.1",
  "description": "Frontal Workers SDK — deploy and invoke serverless workers on the edge runtime",
  "keywords": [
    "javascript",
    "typescript",
    "workers",
    "serverless",
    "edge",
    "frontend",
    "frontend-labs",
    "frontal",
    "frontal-labs"
  ],
  "homepage": "https://github.com/frontal-labs/sdk-typescript/tree/master/packages/workers",
  "bugs": "https://github.com/frontal-labs/sdk-typescript/issues",
  "license": "MIT",
  "author": "Frontal Labs",
  "files": [
    "dist",
    "src"
  ],
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "bin": {
    "frontal-workers": "./dist/index.mjs"
  },
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.cjs"
      }
    },
    "./dist/*": "./dist/*",
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "repository": {
    "type": "git",
    "url": "https://github.com/frontal-labs/sdk-typescript.git",
    "directory": "packages/workers"
  },
  "scripts": {
    "build": "tsup && tsc --emitDeclarationOnly",
    "build:watch": "tsup --watch",
    "type-check": "tsc --noEmit",
    "test": "bun test",
    "lint": "biome lint src/ tests/",
    "clean": "rm -rf dist",
    "docs": "typedoc --entryPoints src/index.ts --out docs/v2 --entryPoints src/packages/* --excludePrivate --excludeProtected",
    "docs:json": "typedoc --json docs/v2/spec.json --entryPoints src/index.ts --entryPoints src/packages/* --excludePrivate --excludeExternals --excludeProtected"
  },
  "jsdelivr": "dist/umd/frontal-labs.js",
  "unpkg": "dist/umd/frontal-labs.js",
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "engines": {
    "bun": ">=1.3.8",
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@frontal-labs/core": "workspace:*",
    "tslib": "^2.8.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@frontal-labs/testing": "workspace:*",
    "@types/bun": "^1.3.8",
    "@types/node": "^25.2.1",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8",
    "biome": "^0.5.0"
  }
}
```

### 4. Create `tsconfig.json`

Copy the base configuration used by other packages:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022", "dom"]
  },
  "include": ["src"],
  "exclude": ["node_modules/**/*.ts"]
}
```

### 5. Create `tsup.config.ts`

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  external: ["zod"],
});
```

### 6. Create `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import { resolveAliases } from "../../vitest.preset";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
    ],
    exclude: ["node_modules", "dist", "**/*.d.ts"],
    testTimeout: 5000,
    hookTimeout: 5000,
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      reportsDirectory: "../../coverage/packages/workers",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "dist/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: resolveAliases,
  },
});
```

### 7. Create Supporting Files

#### `.npmrc`

```
@frontal-labs:registry=https://registry.npmjs.org/
```

#### `.gitignore`

```
# Dependencies
node_modules/
dist/
coverage/
*.log

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Runtime files
*.pid
*.seed
*.pid.lock

# Temporary files
.tmp/
temp/

# Build artifacts
*.tsbuildinfo
```

#### `.env.example`

```
# Frontal Workers Environment Variables
# Copy this file to .env and fill in your values

# Development
NODE_ENV=development

# Testing
CI=false

# Coverage reporting
COVERAGE_DIR=coverage

# Frontal Configuration
FRONTAL_API_KEY=your_api_key_here
FRONTAL_BASE_URL=https://api.frontal.dev

# Worker-specific Configuration
WORKERS_TIMEOUT=30000
WORKERS_MAX_RETRIES=3
```

#### `turbo.json`

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "lib/**"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    },
    "format": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    },
    "format:check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", "src/**/*.test.ts", "tests/**/*.ts"],
      "cache": false
    },
    "test:watch": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", "src/**/*.test.ts", "tests/**/*.ts"],
      "cache": false
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["$TURBO_DEFAULT$", "src/**/*.test.ts", "tests/**/*.ts"],
      "cache": false
    },
    "clean": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "lib/**"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "cache": false
    }
  }
}
```

### 8. Create Documentation Files

#### `README.md`

```markdown
# @frontal-labs/workers

Frontal Workers SDK — deploy and invoke serverless workers on the edge runtime.

## Installation

```bash
npm install @frontal-labs/workers
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts
import { workers } from "@frontal-labs/workers";

// Deploy a worker from source code
const worker = await workers.deploy({
  name: "my-worker",
  code: `
    export default {
      fetch(request) {
        return new Response("Hello from Worker!");
      }
    }
  `,
});

// Invoke the worker
const response = await workers.invoke("my-worker");
const text = await response.text();
console.log(text); // "Hello from Worker!"
```

## API

### `createWorkersClient(config)`

Creates a WorkersService instance from a configuration or an existing `FrontalClient`.

#### Parameters
- `config`: Either a `FrontalClient` instance or a `WorkersClientConfig` object.

#### Returns
- `WorkersClient`

### `workers`

A pre‑configured default client that reads from environment variables (`FRONTAL_API_KEY`, `FRONTAL_API_URL`, etc.).

### `WorkersService`

Class providing low‑level access to the Workers API.

#### `deploy(input)`

Deploys a worker from source code.

##### Parameters
- `input`: `DeployWorkerInput`
  - `name`: Worker identifier (RFC 1123 DNS‑safe).
  - `code`: JavaScript/TypeScript source code.
  - `entrypoint?`: Exported function name (defaults to the module's default export).
  - `envVars?`: Environment variables exposed to the worker.

##### Returns
- Promise resolving to a `WorkerRef` object.

#### `invoke(name, options?)`

Invokes a deployed worker.

##### Parameters
- `name`: Worker name.
- `options?`: `InvokeWorkerOptions`
  - `method?`: HTTP method (defaults to `"GET"`).
  - `path?`: Path appended after the worker name.
  - `headers?`: Record of header strings.
  - `body?`: Body to send (string, `Uint8Array`, `ArrayBuffer`, `Blob`, or `ReadableStream`).

##### Returns
- Promise resolving to a `Response` object.

### Types

- `DeployWorkerInput`
- `InvokeWorkerOptions`
- `WorkerRef`

## Environment Variables

The SDK reads the following environment variables when using the default `workers` instance:

| Variable | Description |
|----------|-------------|
| `FRONTAL_API_KEY` | Your Frontal API key (required in production). |
| `FRONTAL_API_URL` | Base URL for the Frontal API (defaults to `https://api.frontal.dev`). |
| `WORKERS_TIMEOUT` | Request timeout in milliseconds (default: `30000`). |
| `WORKERS_MAX_RETRIES` | Maximum retry attempts (default: `3`). |

## License

MIT © Frontal Labs
```

#### `CHANGELOG.md`

```markdown
# Changelog

## 0.0.1

### Patch Changes

- Initial public release of @frontal-labs/workers.
```

### 9. Create Source Files

#### `src/constants.ts`

```ts
/**
 * Default base URL for Frontal Workers services.
 */
export const DEFAULT_WORKERS_BASE_URL = "https://api.frontal.dev/v1";

/**
 * Package version.
 */
export const VERSION = "0.0.1";
```

#### `src/index.ts`

```ts
/**
 * @frontal-labs/workers
 *
 * Deploy and invoke serverless Workers on the Frontal edge runtime.
 */

import {
  FrontalClient,
  getDefaultClient,
  HttpClient,
} from "@frontal-labs/core";
import { DEFAULT_WORKERS_BASE_URL } from "./constants";
import { WorkersService } from "./service";

export interface WorkersClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export function createWorkersClient(
  config: WorkersClientConfig | FrontalClient
): WorkersService;
export function createWorkersClient(
  clientOrConfig: FrontalClient | WorkersClientConfig
): WorkersService {
  if (clientOrClient instanceof FrontalClient) {
    return new WorkersService(clientOrClient.httpClient);
  }
  const http = new HttpClient({
    apiKey: clientOrConfig.apiKey,
    baseUrl:
      clientOrConfig.baseUrl ??
      process.env.FRONTAL_WORKERS_API_URL ??
      process.env.FRONTAL_API_URL ??
      DEFAULT_WORKERS_BASE_URL,
    timeout: clientOrConfig.timeout ?? 30_000,
    maxRetries: clientOrConfig.maxRetries ?? 3,
    retryDelay: 1000,
    headers: {},
    environment: "production",
    debug: false,
  });
  return new WorkersService(http);
}

let _workersCache: WorkersService | undefined;
export const workers = new Proxy<WorkersService>({} as WorkersService, {
  get(_t, prop) {
    if (!_workersCache) {
      _workersCache = createWorkersClient(getDefaultClient());
    }
    const inst = _workersCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});

export { DEFAULT_WORKERS_BASE_URL, VERSION } from "./constants";
export type {
  DeployWorkerInput,
  InvokeWorkerOptions,
  WorkerRef,
} from "./service";
export { WorkersService } from "./service";
```

#### `src/service.ts`

```ts
import type { HttpClient } from "@frontal-labs/core";

/** A deployed worker reference returned by the edge runtime. */
export interface WorkerRef {
  name: string;
  [key: string]: unknown;
}

export interface DeployWorkerInput {
  /** Worker identifier (RFC 1123 DNS-safe). */
  name: string;
  /** JavaScript/TypeScript source code. */
  code: string;
  /** Exported function name (defaults to the module's default export). */
  entrypoint?: string;
  /** Environment variables exposed to the worker at runtime. */
  envVars?: Record<string, string>;
}

export interface InvokeWorkerOptions {
  method?: string;
  /** Path appended after the worker name, e.g. `/hello`. */
  path?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array | ArrayBuffer | Blob | ReadableStream;
}

/**
 * Client for the Frontal Workers API (`/v1/workers`) — the serverless edge
 * runtime. Deploy a worker from source (or a pre‑bundled ESZIP), then invoke it
 * by path.
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class WorkersService {
  private static readonly BASE = "/workers";

  constructor(private readonly http: HttpClient) {}

  /** Deploy a worker from JSON source. */
  deploy(input: DeployWorkerInput): Promise<WorkerRef> {
    return this.http.post<WorkerRef>(WorkersService.BASE, {
      name: input.name,
      code: input.code,
      entrypoint: input.entrypoint,
      env_vars: input.envVars,
    });
  }

  /**
   * Invoke a deployed worker by name. Returns the raw {@link Response} so callers
   * can stream or parse the worker's output as needed.
   */
  invoke(name: string, opts: InvokeWorkerOptions = {}): Promise<Response> {
    const path = `${WorkersService.BASE}/${name}${opts.path ?? ""}`;
    const method = (opts.method ?? "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") {
      return this.http.getRaw(path, undefined, opts.headers);
    }
    return this.http.postRaw(path, opts.body, opts.headers);
  }
}
```

#### `src/keys.ts`

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FRONTAL_API_URL: z
      .url()
      .optional()
      .refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
        message: "FRONTAL_API_URL is required in production",
      }),
    FRONTAL_API_KEY: z
      .string()
      .min(1)
      .optional()
      .refine((val) => !(process.env.NODE_ENV === "production") || !!val, {
        message: "FRONTAL_API_KEY is required in production",
      }),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    FRONTAL_API_URL: process.env.FRONTAL_API_URL,
    FRONTAL_API_KEY: process.env.FRONTAL_API_KEY,
  },
  emptyStringAsUndefined: true,
});
```

#### `src/schemas.ts`

```ts
import { z } from "zod";

/**
 * Zod schema for DeployWorkerInput.
 */
export const deployWorkerInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  entrypoint: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

/**
 * Input for deploying a worker.
 */
export type DeployWorkerInput = z.infer<typeof deployWorkerInputSchema>;

/**
 * Zod schema for InvokeWorkerOptions.
 */
export const invokeWorkerOptionsSchema = z.object({
  method: z
    .string()
    .uppercase()
    .default("GET")
    .refine((val) => ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(val), {
      message: "Invalid HTTP method",
    }),
  path: z.string().optional(),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(), // Allow any body type (string, Blob, etc.)
});

/**
 * Options for invoking a worker.
 */
export type InvokeWorkerOptions = z.infer<typeof invokeWorkerOptionsSchema>;

/**
 * Zod schema for WorkerRef (passthrough to allow extra fields).
 */
export const workerRefSchema = z.object({
  name: z.string(),
}).passthrough();

/**
 * A deployed worker reference.
 */
export type WorkerRef = z.infer<typeof workerRefSchema>;

// Re-export for convenience
export {
  deployWorkerInputSchema,
  invokeWorkerOptionsSchema,
  workerRefSchema,
};
```

### 10. Create a Basic Test File

#### `tests/workers.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { WorkersService } from "../src/service";
import { HttpClient } from "@frontal-labs/core";

describe("WorkersService (unit)", () => {
  // Mock HttpClient for unit tests
  const mockHttp = {
    post: vi.fn(),
    getRaw: vi.fn(),
    postRaw: vi.fn(),
  } as unknown as HttpClient;

  const service = new WorkersService(mockHttp);

  it("should deploy a worker", async () => {
    const mockResponse = { name: "test-worker" };
    mockHttp.post.mockResolvedValueOnce(mockResponse);

    const result = await service.deploy({
      name: "test-worker",
      code: "export default { fetch: () => new Response('hi') }",
    });

    expect(mockHttp.post).toHaveBeenCalledWith("/workers", {
      name: "test-worker",
      code: "export default { fetch: () => new Response('hi') }",
      entrypoint: undefined,
      env_vars: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should invoke a worker with GET", async () => {
    const mockResponse = new Response("ok");
    mockHttp.getRaw.mockResolvedValueOnce(mockResponse);

    const result = await service.invoke("test-worker");

    expect(mockHttp.getRaw).toHaveBeenCalledWith(
      "/workers/test-worker",
      undefined,
      undefined
    );
    expect(result).toBe(mockResponse);
  });

  it("should invoke a worker with POST and body", async () => {
    const mockResponse = new Response("created");
    mockHttp.postRaw.mockResolvedValueOnce(mockResponse);

    const result = await service.invoke("test-worker", {
      method: "POST",
      body: "payload",
    });

    expect(mockHttp.postRaw).toHaveBeenCalledWith(
      "/workers/test-worker",
      "payload",
      undefined
    );
    expect(result).toBe(mockResponse);
  });
});
```

### 11. Install Dependencies

```bash
cd /Users/gabrielfonseca/Documents/sdk-typescript/packages/workers
bun install
```

### 12. Build the Package

```bash
bun run build
```

### 13. Lint the Source

```bash
bun run lint
```

### 14. Run Tests

```bash
bun run test
```

### 15. (Optional) Generate Documentation

```bash
bun run docs
bun run docs:json
```

---

## Verification

After completing the steps above, ensure:

- The build produces `dist/` with `.cjs`, `.mjs`, and `.d.ts` files.
- Linting passes with no errors.
- All tests pass.
- The package can be imported in a test project and used as shown in the README.

Once verified, you may publish the package to NPM (if desired) and proceed to remove any outdated SDKs as planned.

---
**End of Plan**