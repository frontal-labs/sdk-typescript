# Releasing Packages

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing of our packages. This ensures that only changed packages are versioned and published, with automated changelog generation.

## Release Workflow

### 1. Add a Changeset

Every pull request that introduces a user-facing change (feature or fix) should include a changeset file.

```bash
bun run changeset
```

Follow the interactive prompt to:
- Select which packages are affected
- Choose whether the change is `patch`, `minor`, or `major`
- Enter a brief description of the change

### 2. Versioning

When we are ready to release, a maintainer will run:

```bash
bun run version-packages
```

This will:
- Consume the changeset files
- Update the `package.json` files and `CHANGELOG.md` files for all affected packages
- Create a commit with the updated versions
- Update the lockfile

### 3. Publishing

After the versions have been updated and merged into the default branch, the packages can be published to npm:

```bash
bun run release
```

This script will:
- Run a build across all packages to ensure they are up-to-date
- Publish packages to npm in dependency order
- Create GitHub releases with changelogs

## Automated Releases

We use GitHub Actions to automate the release process:

- **Version Bumping**: Triggered when changesets are merged to main
- **Publishing**: Automatically publishes new versions to npm
- **GitHub Releases**: Creates releases with automatically generated changelogs

## Best Practices

### Changeset Guidelines

- **Atomic Changesets**: Include one changeset per feature or fix
- **Clear Descriptions**: Write descriptions that are helpful to users in the changelog
- **Correct Version Types**: 
  - `patch`: Bug fixes and minor improvements
  - `minor`: New features and enhancements
  - `major`: Breaking changes

### Pre-Release Checklist

Before publishing:

1. **Tests Pass**: Ensure all tests pass locally
2. **Build Success**: Verify all packages build successfully
3. **Documentation**: Update relevant documentation
4. **Changelog Review**: Review generated changelogs for accuracy

### Post-Release

After publishing:

1. **Verify npm**: Confirm packages are available on npm
2. **GitHub Release**: Check GitHub release is created correctly
3. **Community Update**: Announce releases in community channels
4. **Dependencies**: Update dependent projects if needed

## Troubleshooting

### Common Issues

- **Permission Denied**: Ensure you have npm publish permissions
- **Version Conflicts**: Check for version conflicts in dependencies
- **Build Failures**: Resolve build issues before publishing

### Getting Help

- **Documentation**: Check [Changesets documentation](https://github.com/changesets/changesets)
- **Issues**: Report publishing issues on GitHub
- **Discord**: Ask questions in our Discord server

## Package Structure

Each package follows this structure for releases:

```
packages/{package-name}/
├── src/           # Source code
├── dist/          # Built files
├── CHANGELOG.md   # Auto-generated changelog
├── package.json   # Package configuration
└── README.md      # Package documentation
```

## Version Policy

- **Semantic Versioning**: Follow [SemVer](https://semver.org/)
- **Compatibility**: Maintain backward compatibility when possible
- **Deprecation**: Provide clear deprecation warnings
- **Breaking Changes**: Document breaking changes thoroughly
