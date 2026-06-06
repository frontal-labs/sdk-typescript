# @frontal-labs/flags

Feature flags SDK with local evaluation, targeting rules, rollouts, and A/B experiments.

## Installation

```bash
bun add @frontal-labs/flags @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createFlagsClient } from "@frontal-labs/flags";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const flags = createFlagsClient(client);

const result = await flags.evaluate("new-dashboard", {
  user_id: "usr_abc",
  attributes: { beta_tester: true },
});

const bulk = await flags.evaluateBulk(
  ["new-dashboard", "dark-mode"],
  { organization_id: "org_123" }
);
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_FLAGS_API_URL` — Custom flags API base URL
