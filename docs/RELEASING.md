# Releasing Packages

We use [Changesets] to manage versioning and publishing to the [npm registry]
under the `@frontal-labs` scope via [Trusted Publishing][tp] (OIDC). No
long-lived tokens are used — npm trusts GitHub Actions directly.

All packages are published with [npm provenance], which cryptographically links
each published package to its source repository. See [NPM_SETUP.md] for the
one-time registry and trust configuration.

[Changesets]: https://github.com/changesets/changesets
[npm registry]: https://www.npmjs.com/
[tp]: https://docs.npmjs.com/using-private-packages-with-github-actions
[npm provenance]: https://docs.npmjs.com/generating-provenance-statements
[NPM_SETUP.md]: ./NPM_SETUP.md

## Release Workflow

### 1. Add a Changeset

Every pull request that introduces a user-facing change (feature, fix, breaking
change) must include a changeset file.

```bash
bun run changeset
```

Follow the prompts to:
- Select the affected packages
- Choose the version bump: `patch`, `minor`, or `major`
- Write a brief, user-facing description of the change

### 2. CI Creates / Updates the Release PR

When changesets are merged to `main`:
1. The Changesets GitHub Action opens (or updates) a **"Version Packages"**
   pull request.
2. That PR contains the version bumps and generated `CHANGELOG.md` entries.
3. CI runs the full build + type-check + test suite on the PR.

### 3. Merge the Release PR

A maintainer reviews and merges the **"Version Packages"** PR into `main`. The
merge triggers the publish workflow:

1. CI passes (build, type-check, test).
2. Changesets publishes all updated packages to npm in dependency order.
3. GitHub Releases are created with the generated changelogs.
4. Documentation is regenerated and deployed.

### 4. Verify

After publishing, confirm:
- Packages appear on [npmjs.com](https://www.npmjs.com/) under `@frontal-labs`
- Packages appear on [GitHub Packages] with the same versions
- Provenance badges are visible on each npm package page
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
| Preview publish | PR opened / updated | `pkg-pr-new` publishes previews |
| Release PR | Changesets merged to main | Bot opens a Version Packages PR |
| Publish | Version Packages PR merged | Published to npm with provenance |
| GitHub Packages | After npm publish | Same versions to GitHub Packages |
| Docs | After publish | API docs generated and deployed to GitHub Pages |

## Provenance

Every package includes `"provenance": true` in its `publishConfig`. When
published from GitHub Actions and Trusted Publishing (which exchanges the
`id-token: write` OIDC token), npm automatically attaches a provenance
statement. Consumers see a "Provenance" badge on the package page confirming
the package was built from this repository.

## Package Publishing Order

Changesets resolves the dependency graph and publishes in correct order:

1. `frontal/core` (no internal dependencies)
2. `frontal/testing` (depends on core)
3. All domain SDKs (depend on core):
   `@frontal-labs/ai`, `@frontal-labs/agents`, `@frontal-labs/audit`,
   `@frontal-labs/auth`, `@frontal-labs/billing`, `@frontal-labs/blob`,
   `@frontal-labs/connectors`, `@frontal-labs/datasets`,
   `@frontal-labs/events`,
   `@frontal-labs/workers`, `@frontal-labs/governance`,
   `@frontal-labs/graph`, `@frontal-labs/integrations`,
   `@frontal-labs/lineage`, `@frontal-labs/observability`,
   `@frontal-labs/ontology`,
   `@frontal-labs/pipelines`,
   `@frontal-labs/sandbox`, `@frontal-labs/schedules`,
   `@frontal-labs/webhooks`,
   `@frontal-labs/workflows`
4. `@frontal-labs/sdk` (depends on all other packages)

## Version Policy

- **Semantic Versioning**: Follow [SemVer](https://semver.org/)
- **patch**: Bug fixes, internal improvements, docs
- **minor**: New features, new public API surface
- **major**: Breaking changes to the public API

## GitHub Packages Dual Publishing

All packages are automatically published to **GitHub Packages**
(`https://npm.pkg.github.com/`) immediately after npm publishing. This provides
a backup registry and enables consumers within the GitHub ecosystem to install
packages directly from GitHub Packages.

### How It Works

1. Changesets publishes to npm (existing flow -- unchanged).
2. The workflow reads the `publishedPackages` output from the Changesets action.
3. Each newly-published package version is re-published to the GitHub Packages
   npm registry using the `GITHUB_TOKEN` for authentication.
4. The publish is idempotent -- if the version already exists on GitHub
   Packages, the step skips it.

### Consuming from GitHub Packages

To install from GitHub Packages instead of npm:

```bash
# Create or update .npmrc in your project:
echo "@frontal-labs:registry=https://npm.pkg.github.com/" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc

# Install as usual:
npm install frontal/core
```

The GitHub token must have `read:packages` scope for public packages.

### GitHub Packages Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `404 Not Found` | Not yet on GitHub Packages | Wait for next release |
| `403 Forbidden` | Missing `packages: write` | Verify workflow permissions |
| Version mismatch | Script skipped due to error | Re-run the workflow |

### Manual GitHub Packages Publish

If a package needs to be published to GitHub Packages outside of CI (e.g., to
recover from a partial failure):

```bash
# Publish all packages that changesets just released:
GITHUB_TOKEN=<token> bun run publish:github

# Or publish a single package manually:
cd packages/<name>
npm publish \
  --no-provenance \
  --registry=https://npm.pkg.github.com/ \
  --@frontal-labs:registry=https://npm.pkg.github.com/ \
  --//npm.pkg.github.com/:_authToken=<token> \
  --access=public
```

The token must have `write:packages` scope. If multiple packages need
re-publishing, re-running the workflow on main is the recommended approach.

## Troubleshooting

| Problem | Likely Cause | Fix |
|:---|:---|:---|
| `npm ERR! 404` | Package doesn't exist | Publish manually or configure trust |
| `npm ERR! 403` | Trusted Publisher missing | Verify owner/repo/workflow |
| Provenance missing | Not published from CI | Publish from GitHub Actions |
| Build failure | Type errors or deps | Run `bun run build` locally |
