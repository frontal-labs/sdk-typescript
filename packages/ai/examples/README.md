# Frontal AI SDK Examples

Runnable examples for the Frontal AI SDK.

## Examples

1. **[Basic Text Generation](./basic-text-generation.ts)**: prompts, conversation history, and sampling parameters.
2. **[Streaming Text Generation](./streaming-text-generation.ts)**: real-time chunks and callbacks.
3. **[Structured Object Generation](./structured-object-generation.ts)**: Zod-typed JSON with validation and retries.
4. **[Structured Decisions](./comprehensive-usage.ts)**: typed `noul`, `choice`, and `score` questions via `ai.decisions.decide`, combined with text generation.
5. **[Prompt Management](./prompt-management.ts)**: reusable prompts, template variables, and chaining.
6. **[Tool System](./tool-system.ts)**: tool definition, registration, and execution.

## Running

```bash
export FRONTAL_API_KEY="frt_..."

# With Bun
bun run examples/basic-text-generation.ts

# With Node 22+
node examples/basic-text-generation.ts
```

## Error handling

Methods return their result directly. Failures are thrown as `FrontalError` (from `@frontal-labs/core`). Input that breaks a rule is rejected before any request, as `DecisionRequestError` for decisions.

```typescript
import { FrontalError } from "@frontal-labs/core";
import { DecisionRequestError } from "@frontal-labs/ai";

try {
  const { text } = await ai.generateText({
    model: "gpt-4o-mini",
    prompt: "Hello",
  });
  console.log(text);
} catch (err) {
  if (err instanceof FrontalError) console.error(err.statusCode, err.message, err.fix ?? "");
  else if (err instanceof DecisionRequestError) console.error(err.issues);
  else throw err;
}
```

## Troubleshooting

- **API key not found**: set `FRONTAL_API_KEY` and check it starts with `frt_`.
- **Network errors**: check the connection and the base URL (`FRONTAL_API_URL`).
- **Decision rejected before sending**: read `err.issues`; each entry names the path and rule.

## Contributing

1. Follow the existing structure.
2. Keep examples type-checked against `src`.
3. Update this index when adding or removing a file.

## License

These examples are part of Frontal Core and follow the [MIT License](../../LICENSE.md).
