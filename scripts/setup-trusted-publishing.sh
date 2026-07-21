#!/usr/bin/env bash
#
# One-time setup: register a GitHub Actions "trusted publisher" (OIDC) on
# npmjs.com for every publishable @frontal-labs package, so CI can publish
# without a long-lived NPM_TOKEN.
#
# Prerequisites:
#   * npm CLI >= 11.5.1        (npm install -g npm@latest)
#   * Logged in as an npm user with publish rights on the @frontal-labs org:
#       npm login
#   * Each package must already exist on npm (published at least once). For a
#     brand-new package name, do the FIRST publish with a token, then run this
#     to switch it to OIDC for all future releases.
#
# 2FA: `npm trust` is a sensitive operation and requires interactive
# browser-based 2FA. npm prints an "Open this URL / Press ENTER" prompt and
# needs a real terminal (TTY) to do so — that's why this script does NOT
# capture npm's output. Run it directly in your terminal:
#
#   bash scripts/setup-trusted-publishing.sh
#
# NOTE: because npm needs the TTY, we classify results by exit code only, not
# by parsing output. A package that already has a trusted publisher fails with
# HTTP 409 ("already exists") — that's harmless, it means it's already set up.
# To replace an existing config, remove it first on npmjs.com
# (package → Settings → Trusted Publisher) and re-run, or use --force below.
#
# --force: revoke any existing publisher for each package before (re-)creating.
# Revocation needs the trust id, which requires a separate authenticated call;
# if it can't determine the id it falls through to create (which then 409s).
set -uo pipefail

REPO="frontal-labs/sdk-typescript"
WORKFLOW="publish.yml"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

ok=""
already=""
failed=""

for p in packages/*/package.json; do
  pkg=$(node -e "const j=require('./$p'); if(!j.private) process.stdout.write(j.name)")
  [ -n "$pkg" ] || continue

  if [ "$FORCE" = "1" ]; then
    # Best-effort revoke of every existing trust id. `list` needs its own auth;
    # run it interactively (no capture) into a temp file we can parse.
    tmp=$(mktemp)
    npm trust list "$pkg" --json >"$tmp" 2>/dev/null || true
    for id in $(node -e 'const fs=require("fs");let s="";try{s=fs.readFileSync(process.argv[1],"utf8")}catch{};try{const j=JSON.parse(s);const a=Array.isArray(j)?j:(j.trustedPublishers||j.publishers||j.data||[]);for(const t of [].concat(a))if(t&&t.id)console.log(t.id)}catch{}' "$tmp"); do
      npm trust revoke "$pkg" --id="$id" --yes || true
    done
    rm -f "$tmp"
  fi

  echo
  echo "=== $pkg ==="
  # No output capture: npm owns the TTY so its interactive 2FA prompt works.
  if npm trust github "$pkg" \
      --repository "$REPO" \
      --file "$WORKFLOW" \
      --allow-publish \
      --yes; then
    ok="$ok $pkg"
  else
    # Exit code alone can't tell "already exists (409)" from a real error, so
    # surface it as needs-review; re-read npm's output above to tell which.
    failed="$failed $pkg"
  fi
done

echo
echo "==================== Summary ===================="
echo "  succeeded:      ${ok:-none}"
echo "  needs review:   ${failed:-none}"
echo
echo "A 'needs review' package that printed HTTP 409 / 'already exists' is fine"
echo "— it already trusts this repo. Anything else is a real error."
echo
echo "Inspect a package with:  npm trust list <package>"
