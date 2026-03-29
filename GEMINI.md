# Frontal SDK - Agent Instructions

## Project Overview

TypeScript/JavaScript SDK monorepo for Frontal services. Packages: ai, compute, functions, blob, flags, logging, notifications.

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
- Test: `bun run test`
- Lint: `bun run lint:ts`; Format: `bun run format`
- Add changeset: `bun run changeset`

## References

- `docs/ARCHITECTURE.md` — Architecture
- `CONTRIBUTING.md` — Contribution guidelines
- `packages/blob/` — Reference package structure
