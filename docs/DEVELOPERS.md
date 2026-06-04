# Developer Guide

## Prerequisites

- [Bun](https://bun.sh/) v1.3.8+
- [Node.js](https://nodejs.org/) v18+ (for compatibility)
- [Git](https://git-scm.com/)

## Initial Setup

```bash
git clone https://github.com/frontal-labs/sdk-typescript.git
cd sdk-typescript
bun install
bun run setup
```

## Monorepo Structure

```
sdk-ts/
├── packages/
│   ├── core/         # Shared transport, auth, retries, pagination, errors
│   ├── testing/      # Test harness: mock fetch, test client, fixtures
│   ├── ai/           # AI inference, embeddings, streaming, structured output
│   ├── agents/       # Agent lifecycle, deployment, executions, timelines
│   ├── blob/         # Object storage: upload, download, signed URLs
│   ├── functions/    # Serverless function deploy, invoke, streaming
│   ├── graph/        # Entity CRUD, relationships, semantic search, history
│   ├── ontology/     # Schema modeling, migrations, AI-powered inference
│   ├── pipelines/    # Declarative data pipelines with substrate orchestration
│   └── workflows/    # Workflow orchestration with approvals and steps
├── docs/             # Project-level documentation
├── examples/         # Cross-package guides and examples
├── .changeset/       # Changesets configuration
├── .github/workflows/ # CI/CD pipelines
├── turbo.json        # Turborepo pipeline configuration
└── tsconfig.base.json # Shared TypeScript configuration
```

## Package Architecture

Each package follows a consistent structure:

```
packages/<name>/
├── src/
│   ├── index.ts      # Public API exports
│   ├── client.ts     # Service client implementation
│   ├── compat.ts     # Convenience class (optional)
│   ├── schemas.ts    # Zod validation schemas
│   ├── constants.ts  # Package constants and defaults
│   ├── keys.ts       # Environment key schema
│   ├── types.ts      # TypeScript type definitions
│   └── error.ts      # Error types and handling
├── tests/
│   └── <name>.test.ts
├── docs/             # Package-specific documentation
├── examples/         # Runnable examples
├── package.json
├── tsconfig.json
├── tsup.config.ts    # Build configuration
└── .npmrc            # Package-level npm config
```

## Common Commands

```bash
# Build all packages (JS bundling + type declarations)
bun run build

# Type-check without emitting
bun run type-check

# Run all tests
bun run test
bun run test:watch     # watch mode
bun run test:coverage  # with coverage

# Lint and format
bun run lint           # lint source and test files
bun run lint:fix       # auto-fix lint issues
bun run format         # format all files
bun run format:check   # check formatting without writing

# Clean build artifacts
bun run clean

# Changesets
bun run changeset       # create a changeset
bun run version-packages # consume changesets and bump versions
bun run release         # publish to npm
```

## Development Workflow

### Making Changes

1. Create a branch: `git checkout -b feat/my-feature`
2. Implement your changes with tests
3. Verify locally:
   ```bash
   bun run build
   bun run type-check
   bun run test
   bun run lint
   ```
4. Add a changeset if user-facing: `bun run changeset`
5. Commit following [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(ai): add streaming support for chat API"
   ```

### Running a Single Package

```bash
cd packages/ai
bun run build       # build just this package
bun test            # test just this package
bun run type-check  # type-check just this package
```

### Dependency Graph

```
core ─────┬──► ai, blob, functions, graph, ontology, pipelines, workflows
          │
testing ──┘──► agents (devDependency on testing)
```

All packages depend on `@frontal-labs/core`. `@frontal-labs/testing` is a devDependency
used for testing packages that integrate with the core client.

## Code Style

- **Biome** for formatting and linting (not ESLint/Prettier)
- 2 spaces, LF line endings, 80-character line width
- `kebab-case` for filenames
- Use `interface` for object types (Biome rule)
- Conventional Commits: `type(scope): subject`

## Build System

Each package is built in two phases:

1. **tsup** — bundles TypeScript source into ESM (`.mjs`) and CJS (`.js`/`.cjs`) output
2. **tsc --emitDeclarationOnly** — generates `.d.ts` declaration files for type consumers

The `tsBuildInfoFile` is placed inside `dist/` so tsup's `clean: true` resets the
incremental build cache on each run.
