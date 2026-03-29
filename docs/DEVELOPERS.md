# Developer Guide

This guide provides information for developers contributing to this project.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)

- [Git](https://git-scm.com/)


### Environment Setup

1.  **Fork and Clone the repository**:

    ```bash
    git clone https://github.com/YOUR_USERNAME/sdk-ts.git
    cd sdk-ts
    ```

2.  **Install dependencies and run setup**:

    ```bash
    bun install
    bun run setup
    ```

   This will install all necessary dependencies and build all the packages in the monorepo.


## Development Workflow

### Making and Committing Changes

1.  **Create a new branch**: `git checkout -b feature/my-awesome-feature`.
2.  Implement your changes.
3.  **Run tests**: `bun run test`.
4.  **Lint and format your code**:

    ```bash
    bun run lint:ts
    bun run lint:fix
    bun run format
    ```
5.  **Type check**: `bun run type-check`
6.  **Commit your changes** following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

    ```bash
    git commit -m "feat(ai): add new feature"
    ```
    Our repository uses `commitlint` to enforce this standard.

### Adding a Changeset

If your contribution includes a new feature, a bug fix, or any user-facing change that requires a version bump, you must add a changeset.

```bash
bun run changeset
```

Follow the prompts to select the affected packages and the appropriate version bump (`patch`, `minor`, or `major`).

## Submitting a Pull Request

Once your changes are ready, push your branch to your fork and open a Pull Request against the default branch of the original repository.
