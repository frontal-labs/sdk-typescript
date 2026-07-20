# Make Core and Testing Packages Private

## Objective
Make the `@frontal-labs/core` and `@frontal-labs/testing` packages not publishable to npm by setting them as private packages and removing their `.npmrc` files.

## Changes Made

### 1. Core Package (`packages/core/`)
- Removed `.npmrc` file
- Added `"private": true` to `package.json`

### 2. Testing Package (`packages/testing/`)
- Removed `.npmrc` file  
- Added `"private": true` to `package.json`

## Verification
- Both packages now have `"private": true` in their `package.json`
- Both packages no longer have `.npmrc` files
- These changes prevent the packages from being accidentally published to npm
- The packages can still be used locally as workspace dependencies

## Files Modified
- `packages/core/.npmrc` (deleted)
- `packages/core/package.json` (added "private": true)
- `packages/testing/.npmrc` (deleted)
- `packages/testing/package.json` (added "private": true)

## Impact
- These packages will not be published to npm when running `changeset publish` or similar publish commands
- They remain fully functional as local workspace dependencies
- Other packages in the monorepo can still depend on them via workspace protocol