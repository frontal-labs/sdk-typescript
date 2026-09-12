# Frontal SDK - Agent Instructions

## Project Overview

TypeScript SDK monorepo for Frontal services. 25 workspace packages under
`packages/*`: `sdk` (unified entry, `new Frontal({ apiKey })`), `core`
(transport, errors, config), `testing` (mocks), and one package per service:
agents, ai, audit, auth, billing, blob, connectors, data, datasets, events,
governance, graph, integrations, lineage, observability, ontology, pipelines,
sandbox, schedules, webhooks, workers, workflows.

## Code Style

- TypeScript only; Biome for formatting and linting (not ESLint/Prettier)
- 2 spaces, LF line endings, 80-character line width, double quotes
- kebab-case for filenames; `interface` for object types; no `enum`
- Zod v4 schemas in `schemas.ts`; derive input types with `z.input`, output
  types with `z.infer` (defaulted fields must be optional for callers)
- Conventional Commits: `type(scope): subject`

## Architecture

- Turborepo monorepo, Bun as package manager and runtime, Changesets for versioning
- Each service package: `client.ts` (createXClient + deprecated env singleton),
  `sdk.ts` (XSdk class taking `HttpClient`), `schemas.ts`, `constants.ts`, `index.ts`
- `packages/sdk/src/sdk.ts` exposes every service as a lazy getter on `Frontal`
- Docs are tested: every ```ts block in `README.md`, `packages/*/README.md` and
  `examples/SDKS_GUIDE.md` is extracted and type-checked by `bun run test:examples`.
  Tag a block ```ts prelude to share setup with later blocks, or ```ts skip
  (with a `// TODO(example): reason` line) to exclude it.
- `llms.txt`, `llms-full.txt` and `docs/mcp.json` are generated: run
  `bun run docs:llms` after editing any README.

## Common Tasks

- Build: `bun run build`
- Test: `bun run test`; docs examples: `bun run test:examples`
- Lint: `bun run lint`; Format: `bun run format`; Types: `bun run type-check`
- Contract gates: `bun run contract:endpoints`, `bun run contract:matrix`
- Regenerate llms docs: `bun run docs:llms`
- Add changeset: `bun run changeset`

## References

- `SKILL.md` — how to write code against this SDK (for agents and humans)
- `docs/ARCHITECTURE.md` — Architecture
- `docs/TESTING.md` — Testing recipes
- `CONTRIBUTING.md` — Contribution guidelines
- `packages/sdk/` — canonical quickstart; `packages/blob/` — reference package structure
