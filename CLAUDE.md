@AGENTS.md

# TypeScript SDK repository instructions

Read `AGENTS.md` first for repository layout, project conventions, and contract rules. Read `README.md` and the relevant design docs before changing public SDK behavior.

## Contract and compatibility

Use Bun and the workspace package structure, Biome, Zod v4, and Changesets. Preserve the lazy service getter facade and established package patterns. Keep docs examples type-checked and derive endpoint behavior from committed contracts.

Do not add public endpoints, wire fields, or behavior unsupported by the committed contracts. Keep credentials, tokens, and customer data out of source, logs, fixtures, and examples. Make the smallest compatible change and update documentation/examples when public behavior changes.

## Skills

Use the matching skill in `.claude/skills/` when its topic applies. Skills are also linked from `.agents/skills/`; source files live in `skills/` and selected upstream sources are recorded in `skills/SOURCES.md`.

## Verification commands

Run only the commands relevant to the change; do not claim verification unless it was run.

```sh
bun run build
bun run test
bun run test:examples
bun run lint
bun run format
bun run type-check
bun run contract:endpoints
bun run contract:matrix
```
