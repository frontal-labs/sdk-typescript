# JSR Publishing

This guide covers publishing Frontal SDK packages to the JavaScript Registry (JSR).

## What is JSR?

JSR (JavaScript Registry) is a modern package registry for JavaScript and TypeScript that offers:

- **Native TypeScript Support** - Type definitions are first-class citizens
- **Cross-Runtime Compatibility** - Works with Node.js, Deno, Bun, and browsers
- **Modern Tooling** - Built with modern development practices in mind
- **Semantic Versioning** - Automatic semantic version enforcement

## Current Status

The Frontal SDK is currently **not configured** to publish to JSR. We are evaluating JSR for future releases alongside our existing npm publishing strategy.

## Migration Plan

### Phase 1: Evaluation (Current)

- Assess JSR compatibility with existing packages
- Evaluate tooling and build process changes
- Test publishing workflow with select packages

### Phase 2: Dual Publishing (Planned)

- Publish to both npm and JSR
- Maintain backward compatibility
- Gather community feedback

### Phase 3: JSR Primary (Future)

- Make JSR the primary registry
- Maintain npm as legacy support
- Migrate documentation and examples

## Package Configuration

When we enable JSR publishing, packages will need a `jsr.json` configuration:

```json
{
  "name": "@frontal-labs/ai",
  "version": "1.0.0",
  "description": "Frontal AI SDK - integration and utilities",
  "exports": {
    ".": "./src/index.ts"
  },
  "publish": {
    "include": ["src/**/*", "README.md", "LICENSE"]
  }
}
```

## Publishing Workflow

### Prerequisites

1. **JSR Account**: Create account at [jsr.io](https://jsr.io)
2. **Authentication**: Set up API tokens
3. **Package Scope**: Claim `@frontal` organization scope

### Publishing Commands

```bash
# Publish a package
jsr publish

# Publish with dry run
jsr publish --dry-run

# Publish specific version
jsr publish --version 1.2.3
```

### CI/CD Integration

GitHub Actions workflow for JSR publishing:

```yaml
name: Publish to JSR

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for JSR publishing
    
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      
      - name: Publish to JSR
        run: jsr publish
        env:
          JSR_TOKEN: ${{ secrets.JSR_TOKEN }}
```

## Benefits of JSR

### For Developers

- **Better TypeScript Experience** - Native type support
- **Faster Installation** - Optimized package resolution
- **Cross-Runtime** - Single package works everywhere

### For Maintainers

- **Simplified Publishing** - No need to build separate type definitions
- **Better Documentation** - Auto-generated API docs
- **Modern Standards** - Built for the JavaScript ecosystem

## Migration Considerations

### Breaking Changes

- **Import Paths**: May need to adjust import statements
- **Build Process**: Changes to build and bundling
- **Dependencies**: Ensure all dependencies are JSR-compatible

### Compatibility

- **Node.js Projects**: Continue to work with existing tooling
- **TypeScript**: Improved experience with native types
- **Bundlers**: Most bundlers support JSR packages

## Timeline

- **Q3 2026**: Complete evaluation phase
- **Q4 2026**: Begin dual publishing experiment
- **Q1 2027**: Full JSR integration (pending evaluation results)

## Getting Started with JSR

While we complete our evaluation, you can experiment with JSR:

```bash
# Install JSR CLI
npm install -g jsr

# Create a new JSR package
jsr init

# Publish your own package
jsr publish
```

## Resources

- [JSR Documentation](https://jsr.io/docs)
- [JSR vs npm](https://jsr.io/docs/comparison)
- [Publishing Guide](https://jsr.io/docs/publishing)

## Feedback

We're interested in community feedback on JSR adoption:

- **GitHub Discussions**: Share your thoughts on JSR migration
- **Issues**: Report JSR-related problems or suggestions
- **Surveys**: Participate in our migration surveys

---

*Note: This document will be updated as our JSR strategy evolves. Check back regularly for the latest information.*
