---
name: typescript-zod-sdk-contracts
description: Build contract-backed TypeScript service methods with Zod schemas in the Frontal SDK monorepo.
---

# TypeScript Zod SDK Contracts

Use this skill when adding or changing a service method, schema, or public type in `sdk-typescript`.

- Confirm routes and wire fields in the committed endpoint inventory and OpenAPI snapshots; don't derive endpoint shapes from names or another SDK.
- Keep domain behavior inside its `packages/<service>` package and shared transport in `packages/core`. Follow the nearby package's client, SDK class, schema, constants, and exports pattern.
- Define validation with Zod v4. Export caller input types using `z.input` where defaults make fields optional; use inferred output types for parsed values.
- Keep TypeScript API keys camelCase and rely on package conversion to wire naming. Test serialization and response parsing at the package boundary.
- Add contract coverage and an executable README example for public behavior; add a Changeset when releasing package changes.
- Run focused package tests, then build, lint, type-check, examples, and `bun run contract:endpoints` as appropriate.

Read root `AGENTS.md` and follow Bun/Biome conventions.
