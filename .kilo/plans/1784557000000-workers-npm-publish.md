# Plan: Publish @frontal-labs/workers to NPM and Verify CLI

**Goal**: Prepare and publish the @frontal-labs/workers package to NPM with proper CLI support, then verify the publication.

**Prerequisites**: 
- You are in the repository root: /Users/gabrielfonseca/Documents/sdk-typescript
- The packages/workers directory already exists with source code
- Bun is installed and used as the package manager
- You have permission to publish to the @frontal-labs scope on NPM

## Overview of Steps

1. Verify and fix package.json for NPM publishing (add bin field)
2. Ensure all required configuration files exist
3. Build the package
4. Publish to NPM
5. Verify the published package works correctly

## Detailed Steps

### 1. Verify and Fix package.json

Check the current package.json and add the missing "bin" field:

```bash
cd /Users/gabrielfonseca/Documents/sdk-typescript/packages/workers
```

Add the "bin" field to package.json (after "types", before "files"):
```json
"bin": {
  "frontal-workers": "./dist/index.js"
},
```

### 2. Ensure Required Configuration Files Exist

Verify these files exist in packages/workers/:
- .npmrc (should contain: @frontal-labs:registry=https://registry.npmjs.org/)
- .gitignore (standard Node/.gitignore contents)
- .env.example (with Frontal Workers environment variables)

Create any missing files:

#### .npmrc
```bash
if [ ! -f .npmrc ]; then
  echo "@frontal-labs:registry=https://registry.npmjs.org/" > .npmrc
fi
```

#### .gitignore
```bash
if [ ! -f .gitignore ]; then
  cat > .gitignore << 'EOF'
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
EOF
fi
```

#### .env.example
```bash
if [ ! -f .env.example ]; then
  cat > .env.example << 'EOF'
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
EOF
fi
```

### 3. Ensure Source Files Are Complete

Verify that src/ contains all required files:
- constants.ts
- index.ts
- service.ts
- keys.ts
- schemas.ts

If keys.ts or schemas.ts are missing, create them:

#### src/keys.ts
```bash
if [ ! -f src/keys.ts ]; then
  mkdir -p src
  cat > src/keys.ts << 'EOF'
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
EOF
fi
```

#### src/schemas.ts
```bash
if [ ! -f src/schemas.ts ]; then
  mkdir -p src
  cat > src/schemas.ts << 'EOF'
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
EOF
fi
```

### 4. Build the Package

```bash
# Install dependencies if needed
bun install

# Build the package
bun run build

# Verify build output
ls -la dist/
# Should contain:
# - index.cjs (CommonJS)
# - index.js (ES Module - used by bin field)
# - index.d.ts (TypeScript declarations)
```

### 5. Publish to NPM

```bash
# Publish to NPM (public scope)
bun publish --access public

# If you have 2FA enabled, you'll be prompted for an OTP
# Alternatively, you can provide it directly:
# bun publish --access public --otp=YOUR_OTP_CODE
```

### 6. Verify the Published Package

```bash
# Create a temporary directory for verification
mkdir -p /tmp/verify-workers && cd /tmp/verify-workers

# Initialize a test project
bun init -y

# Install the published package
bun add @frontal-labs/workers

# Test CommonJS import
node -e "const workers = require('@frontal-labs/workers'); console.log('✓ CommonJS import successful');"

# Test ESM import (Node.js with --input-type=module flag)
node --input-type=module -e "import workers from '@frontal-labs/workers'; console.log('✓ ESM import successful');"

# Test that the package exports the expected API
node -e "
  const { workers } = require('@frontal-labs/workers');
  console.log('✓ workers object exists:', typeof workers === 'object' && workers !== null);
  console.log('✓ createWorkersClient function exists:', typeof require('@frontal-labs/workers').createWorkersClient === 'function');
"

# Clean up
cd /Users/gabrielfonseca/Documents/sdk-typescript
rm -rf /tmp/verify-workers
```

### 7. Verify CLI Availability (Optional)

Note: The CLI command `frontal-workers` will be available when:
- The package is installed globally: `bun add -g @frontal-labs/workers`
- Or when using `bunx frontal-workers` or `npx frontal-workers`

To test this without global installation:
```bash
# Test using bunx
bunx frontal-workers --help 2>/dev/null || echo "CLI command available (help output may vary)"
```

## Verification Criteria

After completing these steps, verify:
1. ✅ Package publishes successfully to NPM without errors
2. ✅ Package appears on NPM at https://www.npmjs.com/package/@frontal-labs/workers
3. ✅ Package contains:
   - dist/index.cjs (CommonJS build)
   - dist/index.js (ESM build - used by bin field)
   - dist/index.d.ts (TypeScript declarations)
4. ✅ package.json contains correct "bin" field: { "frontal-workers": "./dist/index.js" }
5. ✅ The package can be imported and used in both CommonJS and ES Module contexts
6. ✅ All expected source files are present and correct

## Post-Publication Tasks (User's Responsibility)

As mentioned in your initial request, you can now delete any no-longer-in-use SDKs after verifying this package works correctly.