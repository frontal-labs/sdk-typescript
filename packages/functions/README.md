# @frontal-labs/functions

User-defined functions client for the Frontal platform.

## Installation

```bash
bun add @frontal-labs/functions
```

## Usage

### Standalone client

```ts
import { createFunctionsClient } from "@frontal-labs/functions";

const functions = createFunctionsClient({
  apiKey: process.env.FRONTAL_API_KEY!,
});
```

### Unified Frontal client

```ts
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

// Access functions service
const func = f.functions.use("func_123");
```

## API

See the [API Reference](./docs/API-REFERENCE.md) for detailed documentation.

## Examples

See the [examples](./examples) directory for runnable examples.

## License

Apache-2.0 © Frontal Labs