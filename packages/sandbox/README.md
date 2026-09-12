# @frontal-labs/sandbox

Isolated code execution with a judge — run snippets, self-test, or submit against test cases.

## Installation

```bash
bun add @frontal-labs/sdk
```

The unified SDK exposes this service as `f.sandbox`. To install only this
package: `bun add @frontal-labs/sandbox`.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

const result = await f.sandbox.selfTest({
  language: "python",
  code: "print(sum(range(10)))",
});
console.log(result);
```

## Usage

### Standalone client

```ts
import { createSandboxClient } from "@frontal-labs/sandbox";

const sandbox = createSandboxClient({ apiKey: process.env.FRONTAL_API_KEY! });
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createSandboxClient } from "@frontal-labs/sandbox";

const client = new FrontalClient({ apiKey: process.env.FRONTAL_API_KEY! });
const sandbox = createSandboxClient(client);
```

### Submit against test cases

```ts
const verdict = await f.sandbox.submit({
  language: "python",
  code: "print(int(input()) * 2)",
  judge: { judgeType: "classic" },
  task: { cases: [{ caseId: 1, score: 1, input: "21", answer: "42" }] },
  resourceLimits: { timeLimitMs: 2000 },
});
console.log(verdict);
```

### Supported languages

```ts
const languages = await f.sandbox.languages();
console.log(languages);
```
## Error handling

All failures throw a typed `FrontalError` subclass (`NotFoundError`,
`ValidationError`, `RateLimitError`, ...) carrying `code`, `requestId` and
`statusCode`. See [`@frontal-labs/core`](../core/README.md#error-handling).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API key (`frt_...`) |
| `FRONTAL_API_URL` | No | `https://api.frontal.dev/v1` | Base URL for the Frontal API |
| `FRONTAL_ENV` | No | `development` | `development` \| `test` \| `production` |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
