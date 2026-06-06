# @frontal-labs/governance

Governance SDK for policy management, RBAC bindings, and policy evaluation.

## Installation

```bash
bun add @frontal-labs/governance @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createGovernanceClient } from "@frontal-labs/governance";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const gov = createGovernanceClient(client);

const policy = await gov.policies.create({
  name: "No public dataset access",
  rules: [{
    id: "rule_1",
    resource: "datasets.*",
    actions: ["export"],
    effect: "deny",
  }],
  enabled: true,
  priority: 10,
});

const result = await gov.evaluatePolicy(policy.id, {
  user_id: "usr_abc",
  resource: { type: "dataset", id: "ds_1" },
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_GOVERNANCE_API_URL` — Custom governance API base URL
