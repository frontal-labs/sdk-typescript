# Branch Protection Rules

The `main` branch is protected with the following rules:

- **Require a pull request before merging** — no direct pushes to `main`
- **Require approvals** — at least 1 approving review
- **Require status checks to pass** — CI must be green before merge
- **Require branches to be up-to-date** — must be current with `main`
- **No force pushes** — force pushing is disabled
- **No branch deletion** — `main` cannot be deleted
- **Require conversation resolution** — all review threads must be resolved

## Formatting and Linting Rules

All branches and PRs must follow the same formatting and linting standards:

- **Format**: Biome formatter with 2-space indentation, 80-character line width,
  LF line endings. Configured in `biome.jsonc`. Run `bun run format` before
  committing.
- **Lint**: Biome linter with all rule groups set to `error` severity
  (a11y, complexity, correctness, nursery, performance, security, style,
  suspicious). Run `bun run lint` and fix all errors before pushing.
- **Hooks enforce these locally**:
  - `pre-commit`: format + lint check on staged files
  - `pre-push`: format + lint check on all tracked files
- **CI enforces these on every PR**: `bun run format:check` and `bun run lint`
  both run in `ci-core.yml`. A PR cannot merge unless both pass.
- **No bypass**: Running `--no-verify` to skip hooks is not acceptable for PRs
  targeting `main`. CI will catch violations regardless.

## Branch Naming Convention

- `main` — production branch (protected)
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `hotfix/<name>` — critical production fixes
- `release/<version>` — release preparation
- `chore/<name>` — maintenance tasks
- `docs/<name>` — documentation changes
- `dependabot/*` — automated dependency updates
