# New Contributor Onboarding Guide

Welcome! We're excited to have you contribute to our project. This guide will walk you through the entire process of making your first contribution.

## Step 1: Setting Up Your Environment

### 1.1. Fork the Repository

First, you need to create your own copy of the project. Go to the project's GitHub page and click the "Fork" button in the top-right corner.

### 1.2. Clone Your Fork

Now, clone the forked repository to your local machine.

```bash
git clone https://github.com/YOUR_USERNAME/sdk-ts.git
cd sdk-ts
```

### 1.3. Install Dependencies and Set Up

Install all the required dependencies and run the initial setup script.

```bash
bun install
bun run setup
```

This ensures that all packages are built and ready for development.

## Step 2: Making Your Changes

### 2.1. Create a New Branch

It's important to create a new branch for each feature or bug fix you work on.

```bash
git checkout -b feature/your-descriptive-feature-name
```

### 2.2. Write Your Code

Now you can start making your changes to the codebase.

### 2.3. Test Your Changes

Make sure that all tests pass after your changes.

```bash
bun run test
```

### 2.4. Type Check

Run TypeScript type checking to ensure type safety:

```bash
bun run type-check
```

### 2.5. Lint and Format

Ensure your code adheres to our style guidelines by running the linter and formatter.

```bash
bun run lint:ts
bun run lint:fix
bun run format
```

## Step 3: Submitting Your Contribution

### 3.1. Add a Changeset (If Necessary)

If your changes affect the behavior of any of the packages (e.g., a new feature or a bug fix), you need to add a changeset.

```bash
bun run changeset
```

### 3.2. Commit Your Changes

Commit your changes with a descriptive message that follows our [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard.

```bash
git add .
git commit -m "feat(ai): implement new execution method"
```

### 3.3. Push to Your Fork

Push your changes to your forked repository.

```bash
git push origin feature/your-descriptive-feature-name
```

### 3.4. Open a Pull Request

Go to the GitHub page of your fork, and you should see a prompt to open a Pull Request. Fill out the PR template with the details of your changes.

## Step 4: Code Review

Your Pull Request will be reviewed by the maintainers against the default branch. Be prepared to answer questions and make adjustments to your code based on the feedback.

Thank you for contributing!
