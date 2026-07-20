# Frontal SDK - Agent Instructions

## Project Overview

TypeScript/JavaScript SDK monorepo for Frontal services. Packages: ai, agents, blob, core, functions, graph, ontology, pipelines, testing, workflows.

## Code Style

- Use TypeScript for all source files
- Biome for formatting and linting (not ESLint/Prettier)
- 2 spaces, LF line endings, 80-character line width
- kebab-case for filenames
- Use `interface` for object types (Biome rule)
- Use Conventional Commits: `type(scope): subject`

## Architecture

- Turborepo monorepo with workspaces under `packages/*`
- Each package: api.ts, client.ts, constants.ts, error.ts, index.ts, keys.ts, types.ts
- Bun as package manager and runtime
- Changesets for versioning

## Common Tasks

- Build: `bun run build`
- Type-check: `bun run type-check`
- Test: `bun run test`
- Lint: `bun run lint` (`bun run lint:fix` with `--fix`); Format: `bun run format`
- Add changeset: `bun run changeset`

## Package tsconfig

- Each package's `tsconfig.json` extends `../../tsconfig.base.json`
- Workspace siblings are resolved via `node_modules/` symlinks (workspace protocol), not via `paths`
- Do NOT add `paths` to package tsconfigs for other workspace packages — it causes `rootDir` violations
- Only the root `tsconfig.json` has `paths` for all `@frontal-labs/*` packages (for IDE support)
- If the IDE shows "Cannot find module '@frontal-labs/core'", restart the TypeScript server

## References

- `docs/ARCHITECTURE.md` — Architecture
- `CONTRIBUTING.md` — Contribution guidelines
- `packages/blob/` — Reference package structure
