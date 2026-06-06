# @frontal-labs/organization

Multi-tenancy SDK for tenants, teams, members, roles, and invitations.

## Installation

```bash
bun add @frontal-labs/organization @frontal-labs/core
```

## Usage

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createOrganizationClient } from "@frontal-labs/organization";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1",
});

const org = createOrganizationClient(client);

const orgData = await org.get();
const tenant = await org.tenants.create({
  name: "Engineering",
  slug: "engineering",
});
```

## Configuration

- `FRONTAL_API_KEY` — Your Frontal API key
- `FRONTAL_ORG_API_URL` — Custom organization API base URL
