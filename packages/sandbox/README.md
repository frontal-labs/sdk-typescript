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

const sbx = await sandbox.sandboxes.create({
  name: "data-processing",
  template_id: "tmpl_python",
  timeout_seconds: 300,
});

await sandbox.sandboxes.start(sbx.id);

const exec = await sandbox.executions.execute(sbx.id, {
  code: "print('hello')",
  language: "python",
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_SANDBOX_API_URL` — Custom sandbox API base URL
