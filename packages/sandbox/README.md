# @frontal-labs/sandbox

Isolated execution SDK for sandbox management, code execution, and file operations.

## Installation

```bash
bun add @frontal-labs/sandbox @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createSandboxClient } from "@frontal-labs/sandbox";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const sandbox = createSandboxClient(client);

// The sandbox is a compile-and-judge engine.
const languages = await sandbox.languages();

// Run once against a single input.
const test = await sandbox.selfTest({
  language: "Python",
  code: "print('hello')",
  stdin: "",
});
console.log(test.summary?.stdout);

// Judge against test cases.
const result = await sandbox.submit({
  language: "Python",
  code: "print(input())",
  task: { cases: [{ caseId: 1, score: 100, input: "ok\n", answer: "ok\n" }] },
});
console.log(result.summary.result, result.summary.score);
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
