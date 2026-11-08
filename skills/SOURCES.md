# Upstream skill sources

pedronauck/skills: skills/mine/typescript-advanced, skills/curated/vitest, and skills/curated/zod; imported from skills.sh. The Vitest skill metadata identifies Vitest 5.x; repository Zod v4 conventions in AGENTS.md take precedence over generic upstream examples.

Local repository-specific skills in this directory were authored for the Frontal SDK and remain the source of truth for Frontal-specific architecture and contract workflow.

frontal-labs/error: skills/frontal-error; installed with `npx skills add frontal-labs/error --skill frontal-error` (skills@1.5.23). The skill describes `@frontal-labs/error` APIs that are newer than the pinned 0.7.0 (for example `serializeFailure`, `failureFingerprint`, `retry`, `category`, `kind`). Check the installed package's exports before using them; see plans/error-integration.md.
