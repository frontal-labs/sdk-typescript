# Publishing to npm (OIDC Trusted Publishing)

Packages are published to npm from CI (`.github/workflows/publish.yml`) using
**npm trusted publishing** — GitHub OIDC instead of a long-lived `NPM_TOKEN`.
No npm token is stored in the repo.

## How it works

1. A push to `main` runs `changesets/action`.
2. If there are pending changesets, the action opens/updates a "Version
   Packages" PR. Merging that PR triggers the actual publish.
3. On publish, `changeset publish` runs `npm publish` for each changed package.
   npm authenticates to the registry via the workflow's OIDC token
   (`id-token: write`) — no password, no token, no 2FA prompt.
4. Provenance attestations are generated automatically.

Requirements already wired into the workflow:

- `permissions: id-token: write` (mints the OIDC token)
- Node 24 + `npm@latest` (trusted publishing needs npm CLI >= 11.5.1)
- **No** `NPM_TOKEN` in env — `changesets/action` auto-selects OIDC only when
  the token is absent.

## One-time setup (required before the first OIDC publish)

Each package must have a trusted publisher registered on npmjs.com that points
at this repo and the `publish.yml` workflow. **This cannot be done from the
workflow** — do it once per package name.

### Option A — CLI (bulk)

```bash
npm install -g npm@latest          # need npm >= 11.5.1
npm login                          # an account with publish rights on @frontal-labs
bash scripts/setup-trusted-publishing.sh   # run with bash, not `bun run`
```

The script registers `frontal-labs/sdk-typescript :: publish.yml` as the
trusted publisher for all 23 publishable packages.

`npm trust` requires interactive **browser-based 2FA** and needs a real
terminal — the script deliberately does not capture npm's output, so its
"Open this URL / Press ENTER" prompt works. Run it directly (not through
`bun run`, and not with output piped/redirected). npm shows the browser
prompt as it hits each package.

A package that already has a trusted publisher fails with HTTP 409
("already exists") — that's harmless, it's already set up. The end-of-run
summary lists such packages under "needs review"; re-read npm's output to tell
a 409 from a genuine error. To replace an existing config, either remove it on
npmjs.com (package → Settings → Trusted Publisher) and re-run, or use
`--force`, which revokes the current publisher before re-creating it:

```bash
bash scripts/setup-trusted-publishing.sh --force
```

### Option B — Web UI (per package)

For each package: npmjs.com → the package → **Settings** → **Trusted Publisher**
→ GitHub Actions, then:

- Organization or user: `frontal-labs`
- Repository: `sdk-typescript`
- Workflow filename: `publish.yml`
- (Environment: leave blank — the release job uses no environment)

### Bootstrapping brand-new package names

A trusted publisher can only be configured for a package that **already exists**
on npm. For a package name that has never been published:

1. Publish version 1 once with a granular/automation token (2FA-bypass), or
2. Run it, then register the trusted publisher and drop the token.

All 23 current package names already exist on npm, so this only matters for
future new packages.

## Note on private workspace packages

`core` and `testing` are private workspace packages (`"private": true`). They
are **not** published — instead they are bundled into each consumer's `dist`
via `noExternal` in the consumer's `tsup.config.ts`. Do not register trusted
publishers for them.

## Troubleshooting

- **`npm error code EOTP` / "requires a one-time password"** — the workflow is
  still using token auth. Confirm `NPM_TOKEN` is not set anywhere in the release
  job's `env:` and that the package has a trusted publisher configured.
- **`npm error 404` / "not permitted"** on OIDC publish — the package has no
  trusted publisher yet, or it points at a different repo/workflow filename.
  Re-run the setup for that package.
- **`Unsupported npm version`** — the runner's npm is < 11.5.1; verify the
  `npm install -g npm@latest` step ran.
