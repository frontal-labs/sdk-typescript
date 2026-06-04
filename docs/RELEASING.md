# Releasing Packages

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and
publishing to the [npm registry](https://www.npmjs.com/) under the `@frontal-labs` scope
via [Trusted Publishing](https://docs.npmjs.com/using-private-packages-with-github-actions)
(OIDC). No long-lived tokens are used — npm trusts GitHub Actions directly.

All packages are published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
which cryptographically links each published package to its source repository. See
[NPM_SETUP.md](./NPM_SETUP.md) for the one-time registry and trust configuration.

## Release Workflow

### 1. Add a Changeset

Every pull request that introduces a user-facing change (feature, fix, breaking change) must
include a changeset file.

```bash
bun run changeset
```

Follow the prompts to:
- Select the affected packages
- Choose the version bump: `patch`, `minor`, or `major`
- Write a brief, user-facing description of the change

### 2. CI Creates / Updates the Release PR

When changesets are merged to `main`:
1. The Changesets GitHub Action opens (or updates) a **"Version Packages"** pull request.
2. That PR contains the version bumps and generated `CHANGELOG.md` entries.
3. CI runs the full build + type-check + test suite on the PR.

### 3. Merge the Release PR

A maintainer reviews and merges the **"Version Packages"** PR into `main`. The merge triggers
the publish workflow:

1. CI passes (build, type-check, test).
2. Changesets publishes all updated packages to npm in dependency order.
3. GitHub Releases are created with the generated changelogs.
4. Documentation is regenerated and deployed.

### 4. Verify

After publishing, confirm:
- Packages appear on [npmjs.com](https://www.npmjs.com/) under `@frontal-labs`
- Provenance badges are visible on each package page
- GitHub Releases are created with correct changelogs

## Manual Release (if CI is unavailable)

```bash
# 1. Consume changesets and bump versions
bun run version-packages

# 2. Build all packages
bun run build

# 3. Publish to npm
bun run release
```

## Automated Pipeline

| Step | Trigger | What Happens |
|:---|:---|:---|
| Preview publish | PR opened / updated | `pkg-pr-new` publishes preview packages for testing |
| Release PR | Changesets merged to main | Changesets bot opens a Version Packages PR |
| Publish | Version Packages PR merged | Packages published to npm with provenance |
| Docs | After publish | API docs generated and deployed to GitHub Pages |

## Provenance

Every package includes `"provenance": true` in its `publishConfig`. When published from
GitHub Actions and Trusted Publishing (which exchanges the `id-token: write` OIDC token),
npm automatically attaches a provenance statement. Consumers see a "Provenance" badge on
the package page confirming the package was built from this repository.

## Package Publishing Order

Changesets resolves the dependency graph and publishes in correct order:

1. `@frontal-labs/core` (no internal dependencies)
2. `@frontal-labs/testing` (depends on core)
3. `@frontal-labs/ai`, `@frontal-labs/blob`, `@frontal-labs/functions`,
   `@frontal-labs/graph`, `@frontal-labs/ontology`, `@frontal-labs/pipelines`,
   `@frontal-labs/workflows` (all depend on core)
4. `@frontal-labs/agents` (depends on core + testing)

## Version Policy

- **Semantic Versioning**: Follow [SemVer](https://semver.org/)
- **patch**: Bug fixes, internal improvements, docs
- **minor**: New features, new public API surface
- **major**: Breaking changes to the public API

## Troubleshooting

| Problem | Likely Cause | Fix |
|:---|:---|:---|
| `npm ERR! 404` | Package doesn't exist yet | Publish once manually or configure org-level trust |
| `npm ERR! 403` | Trusted Publisher not configured | Verify owner/repo/workflow in npm package settings |
| Provenance missing | Not published from CI | Publish from GitHub Actions only |
| Build failure in CI | Type errors or missing deps | Run `bun run build && bun run type-check` locally |
