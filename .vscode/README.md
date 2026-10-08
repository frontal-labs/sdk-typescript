# VS Code workspace setup

This folder contains portable workspace settings, extension recommendations, and manually invoked tasks. Open the repository root as a folder in VS Code; no machine-specific paths are configured. Tasks do not run automatically.

VS Code uses the workspace TypeScript SDK and Biome formatter. Import preferences and file-move updates from the previous editor config are preserved here. Code actions are explicit so save does not silently rewrite unrelated fixes.

The repository's `.editorconfig` remains authoritative for whitespace and line endings. See `AGENTS.md` for the full development workflow.
