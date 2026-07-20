# Plan: Replace Husky with Modern Pre-commit Setup (lint-staged + lefthook)

## Summary
Replace Husky with a modern, faster git hook setup using **lint-staged** for pre-commit (linting/formatting staged files), **lefthook** for commit-msg and pre-push hooks, and keep **commitlint** for conventional commits validation.

## Context

### Current State (Husky)
- **`.husky/pre-commit`**: Runs `biome check --files-ignore-unknown=true --no-errors-on-unmatched --files-ignore-unknown=true --files-ignore-unknown=true "$(git diff --cached --name-only -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.jsonc' '*.css' '*.html' '*.md' | xargs)"` - runs biome on staged files
- **`.husky/commit-msg`**: Runs `commitlint --edit $1` for conventional commits
- **`.husky/pre-push`**: Runs `turbo run type-check test` before push
- **package.json**: `"prepare": "husky"` script runs on install

### Current Config Files
- `package.json` (root) - scripts, devDependencies, prepare script
- `biome.jsonc` - formatter/linter config with VCS integration enabled
- `turbo.json` - task pipeline with type-check and test tasks
- `.husky/` - three git hooks (pre-commit, commit-msg, pre-push)

### Current DevDependencies
- `husky@^9.1.7`
- `@commitlint/cli@^21.0.2`
- `@commitlint/config-conventional@^21.0.2`
- `@biomejs/biome@^2.3.14`
- `turbo@^2.4.2`

## System Impact

| Aspect | Current | After Migration |
|--------|---------|-----------------|
| **Hook Manager** | Husky v9 | lefthook + lint-staged |
| **Pre-commit** | Biome on staged files via shell | lint-staged + biome check |
| **Commit-msg** | commitlint via husky | commitlint via lefthook |
| **Pre-push** | turbo run type-check test via husky | turbo run type-check test via lefthook |
| **Install Hook** | `prepare: husky` | `prepare: lefthook install` |
| **Speed** | Slow (shell per file) | Fast (lint-staged parallel + biome VCS-aware) |
| **DX** | Manual husky install | Auto-install via lefthook |

## Approach

Use **lint-staged** for pre-commit (parallel, only staged files, biome's VCS integration) + **lefthook** for commit-msg/pre-push (fast, Go binary, parallel execution). This is the modern recommended stack (used by Vercel, Vercel AI SDK, etc.).

**Why not just simple git hooks?**
- lint-staged provides: concurrent execution, staged-files-only, better Biome integration
- lefthook provides: parallel pre-push, zero-dep Go binary, easy YAML config, no shell overhead

**Why keep commitlint?** Conventional commits enforcement is separate concern; commitlint is standard.

## Changes

### Files to Remove
- `.husky/` (entire directory - 3 hook files)

### Files to Create
1. **`.lefthook.yml`** - lefthook configuration for commit-msg + pre-push hooks
2. **`.lintstagedrc.json`** - lint-staged config for pre-commit (biome check on staged files)
3. **`.commitlintrc.json`** - commitlint config (extract from package.json)

### Files to Modify
1. **`package.json`** (root)
   - Remove `husky` from devDependencies
   - Add `lint-staged`, `lefthook` to devDependencies
   - Change `"prepare": "husky"` → `"prepare": "lefthook install"`
   - Add `"lint:staged": "lint-staged"` script
   - Move commitlint config to separate file

2. **`biome.jsonc`**
   - Ensure VCS integration is enabled (already: `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }`)
   - Ensure formatter/linter work on staged files via stdin

3. **`turbo.json`** - No changes needed (tasks already exist)

### Files to Update (Package JSONs)
- Root `package.json` only (workspaces use root scripts via turbo)

## Detailed Configurations

### `.lefthook.yml`
```yaml
pre-commit:
  parallel: true
  commands:
    lint-staged:
      glob: "*.{ts,tsx,js,jsx,json,jsonc,css,html,md}"
      run: bunx lint-staged

commit-msg:
  commands:
    commitlint:
      run: bunx commitlint --edit {1}

pre-push:
  parallel: true
  commands:
    type-check:
      run: bun run type-check
    test:
      run: bun run test
```

### `.lintstagedrc.json`
```json
{
  "*.{ts,tsx,js,jsx,json,jsonc,css,html,md}": [
    "biome check --files-ignore-unknown=true --no-errors-on-unmatched"
  ],
  "*.{json,jsonc}": [
    "biome check --files-ignore-unknown=true --no-errors-on-unmatched"
  ],
  "package.json": [
    "biome check --files-ignore-unknown=true --no-errors-on-unmatched"
  ]
}
```

### `.commitlintrc.json`
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "revert", "build", "ci"]]
  }
}
```

## Verification Steps

### 1. Install & Setup
```bash
bun install
# Should auto-run: lefthook install
```

### 2. Test Pre-commit (lint-staged)
```bash
# Stage a file with linting errors
echo "const x = 1;" > packages/core/src/test.ts
git add packages/core/src/test.ts
git commit -m "test: test pre-commit"
# Should fail with biome errors

# Fix and retry
bun run lint:fix
git add packages/core/src/test.ts
git commit -m "test: test pre-commit"
# Should pass
```

### 3. Test Commit-msg (commitlint via lefthook)
```bash
git commit -m "bad commit message"
# Should fail: "type-enum" rule violation

git commit -m "feat: valid conventional commit"
# Should pass
```

### 4. Test Pre-push (lefthook parallel)
```bash
git push origin HEAD
# Should run: type-check (turbo) + test (vitest) in parallel
# Should fail if types/tests fail
```

### 4. Verify Biome VCS Integration
```bash
# Check biome uses .gitignore
bun run format:check
# Should respect .gitignore patterns
```

### 5. Verify Turbo Tasks Still Work
```bash
bun run type-check  # turbo run type-check
bun run test        # turbo run test
bun run lint        # turbo run lint
bun run lint:fix    # turbo run lint -- --fix
```

### 6. Clean Install Test
```bash
rm -rf node_modules
bun install
# Should auto-install lefthook hooks
git commit -m "test: fresh install" --allow-empty
# Should run pre-commit + commit-msg hooks
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Lefthook not auto-installing on `bun install` | `prepare` script runs `lefthook install` |
| lint-staged not finding staged files | Use `biome check` with `--files-ignore-unknown=true` |
| Pre-push too slow | lefthook runs type-check + test in parallel |
| Commitlint config not found | Separate `.commitlintrc.json` with explicit extends |
| Biome VCS ignores not respected | `biome.jsonc` already has `vcs.enabled: true` |

## Rollback Plan
If issues arise:
1. `bun remove lint-staged lefthook`
2. `bun add -D husky@9`
3. Restore `.husky/` from git history
4. `"prepare": "husky"` in package.json