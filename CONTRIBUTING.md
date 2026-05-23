# Contributing to Frontal SDK

Thank you for your interest in contributing to the Frontal SDK! We want to make contributing to this project as easy and transparent as possible.

## Table of Contents

- [Development Process](#development-process)
- [Getting Started](#getting-started)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Development Process

1. **Fork the repo** and create your branch from the default branch
2. **Install dependencies**: `bun install`
3. **Run setup**: `bun run setup` to build packages
4. **Make your changes** following our code style guidelines
5. **Ensure tests pass**: `bun run test`
6. **Type check**: `bun run type-check`
7. **Lint and format**: `bun run lint:ts` and `bun run format`
8. **Add a changeset**: `bun run changeset` if your changes should trigger a version bump
9. **Submit a Pull Request** with detailed description

## Getting Started

### Prerequisites

- **Bun**: v1.3.8 or later ([Install Bun](https://bun.sh/))
- **Git**: Latest stable version ([Install Git](https://git-scm.com/))
- **Node.js**: v18 or later (for compatibility testing)
- **IDE**: VS Code (recommended) with extensions

### Recommended VS Code Extensions

- **TypeScript**: For type checking and IntelliSense
- **Biome**: For formatting and linting
- **GitLens**: For enhanced Git capabilities
- **Thunder Client**: for GitHub PR management

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/sdk-typescript.git
cd sdk-typescript

# Install dependencies
bun install

# Initial setup (builds all packages)
bun run setup

# Verify setup
bun run test
```

## Code Style

We use **Biome** for consistent code formatting and linting.

### Formatting

```bash
# Format all files
bun run format

# Check formatting
bun run format:check
```

### Linting

```bash
# Lint TypeScript files
bun run lint:ts

# Auto-fix linting issues
bun run lint:fix
```

### Style Guidelines

- **TypeScript**: Use strict TypeScript with proper types
- **Naming**: kebab-case for files, PascalCase for classes
- **Imports**: Group imports: external, internal, relative
- **Comments**: JSDoc for public APIs, inline comments for complex logic

#### Example Code Style

```typescript
// External imports
import { z } from 'zod';

// Internal imports
import { CoreClient } from '@frontal/core';

// Relative imports
import { helper } from './utils';

/**
 * Example function with JSDoc
 * @param input - The input parameter
 * @returns Processed output
 */
export function processInput(input: string): string {
  // Inline comment for complex logic
  const processed = input.trim().toLowerCase();
  return processed;
}
```

## Testing

### Test Structure

```
packages/{package}/
├── src/
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── fixtures/       # Test data
│   └── helpers/        # Test utilities
└── package.json
```

### Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run tests for specific package
cd packages/ai
bun test
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AI } from '../src';

describe('AI Package', () => {
  let ai: AI;

  beforeEach(() => {
    ai = new AI({ apiKey: 'test-key' });
  });

  it('should initialize correctly', () => {
    expect(ai).toBeDefined();
    expect(ai.config.apiKey).toBe('test-key');
  });

  it('should handle inference requests', async () => {
    const response = await ai.inference('test prompt');
    expect(response).toBeDefined();
  });
});
```

## Documentation

### Types of Documentation

1. **Code Documentation**: JSDoc comments for public APIs
2. **Package Documentation**: README.md in each package
3. **API Documentation**: Auto-generated from TypeScript
4. **Guides**: Step-by-step tutorials in `docs/`

### Documentation Standards

- **Markdown**: Use GitHub-flavored markdown
- **Code Examples**: Include working examples
- **Links**: Use relative links for internal navigation
- **Spelling**: Use American English

## Pull Request Process

### Before Submitting

1. **Search existing PRs** to avoid duplicates
2. **Update documentation** for any API changes
3. **Add tests** for new functionality
4. **Run full test suite** locally
5. **Update CHANGELOG.md** if applicable

### PR Template

Use our PR template for consistency:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: At least one maintainer review required
3. **Approval**: Maintainer approval required for merge
4. **Merge**: Squash and merge to default branch

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(ai): add support for streaming responses

fix(core): resolve connection timeout issue

docs(readme): update installation instructions

test(storage): add integration tests for S3 provider
```

## Changesets

### When to Add a Changeset

Add a changeset when your change:

- Adds new functionality
- Fixes a bug
- Changes public API
- Updates configuration options

### Adding a Changeset

```bash
bun run changeset
```

Follow the interactive prompt to:
- Select affected packages
- Choose version bump type (patch/minor/major)
- Write a brief description

## Community

### Getting Help

- **Discord**: [Join our Discord](https://discord.gg/frontal)
- **GitHub Discussions**: [Ask questions](https://github.com/frontal-labs/sdk-typescript/discussions)
- **Issues**: [Report bugs](https://github.com/frontal-labs/sdk-typescript/issues)

### Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

### Security

For security-related issues, see our [Security Policy](./SECURITY.md).

## Recognition

### Contributors

All contributors are recognized in:
- **README.md**: Contributors section
- **Release Notes**: Credit for changes
- **GitHub**: Automatic contribution tracking

### First-Time Contributors

We especially welcome first-time contributors! Look for issues labeled `good first issue` for a gentle introduction to the codebase.

---

Thank you for contributing to the Frontal SDK!
