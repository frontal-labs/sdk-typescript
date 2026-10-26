# @frontal-labs/ai

AI inference SDK — text generation, streaming, embeddings, structured output,
speech, transcription, and image/video generation.

## Installation

```bash
npm install @frontal-labs/ai
```

`@frontal-labs/core` is included automatically as a dependency.

## Quick Start

```ts prelude
import { Frontal } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
const ai = f.ai;

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Summarize this incident report",
});
```


## Usage

### Explicit config

```ts
import { createAIClient } from "@frontal-labs/ai";

const ai = createAIClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://ai.frontal.dev",
});

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "Hello",
});
```

### Shared client (multiple SDKs)

```ts
import { FrontalClient } from "@frontal-labs/core";
import { createAIClient } from "@frontal-labs/ai";

const client = new FrontalClient({
  apiKey: process.env.FRONTAL_API_KEY!,
  baseUrl: "https://api.frontal.dev/v1",
});

const ai = createAIClient(client);
```

### Streaming

```ts
const stream = ai.streamText({
  model: "gpt-4o-mini",
  prompt: "Write a haiku about databases",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
console.log(await stream.usage, await stream.finishReason);
```

`textStream` and `fullStream` are two views of the same request — read one of
them from the start. Breaking out of the loop cancels the request.

`fullStream` yields every part — `text`, `tool-call`, `finish`, `error`,
`abort`, `done` — so errors are data you can render and retry, not exceptions
that tear down the UI:

```ts
const ctl = new AbortController();
const stream = ai.streamText({
  model: "gpt-4o-mini",
  prompt: "Write a haiku about databases",
  signal: ctl.signal,
  streamRetries: 2, // retry 429/5xx/network failures before the first byte
  onError: (err) => console.error(err.code, err.fix),
});

for await (const part of stream.fullStream) {
  if (part.type === "text") process.stdout.write(part.text);
  if (part.type === "tool-call") console.log(part.toolName, part.input);
  if (part.type === "error" && !part.error.retryable) ctl.abort();
}
```

### Tools

Define tools with `tool()` (Zod input schema → JSON Schema on the wire) and
pass them to `generateText` / `streamText`. The SDK returns the model's calls;
you execute them — there is no hidden loop.

```ts
import { parseToolInput, tool } from "@frontal-labs/ai";
import { z } from "zod";

const tools = {
  weather: tool({
    description: "Current weather for a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => ({ city, tempC: 21 }),
  }),
};

const result = await ai.generateText({
  model: "gpt-4o-mini",
  prompt: "What's the weather in Lisbon?",
  tools,
  toolChoice: "auto",
});

for (const call of result.toolCalls) {
  if (call.toolName === "weather") {
    const input = parseToolInput(tools, "weather", call.input);
    console.log(await tools.weather.execute?.(input));
  }
}
```

The same `ToolSet` type is accepted by `agents.define(name, { tools })`.

### Structured decisions

Ask typed questions about a state and get typed answers. Names and labels are
plain values, so any string works as a question name or choice label.

```ts
import { choice, noul, score } from "@frontal-labs/ai";

const decision = await ai.decisions.decide({
  model: "frontal-labs/decision-4B",
  state: { ticket: "I was charged twice. Please fix this ASAP." },
  questions: {
    billing: noul("Is this about billing?"),
    category: choice("What is this ticket about?", {
      billing: null,
      technical: null,
      other: null,
    }),
    severity: score("How severe is it?", ["low", "medium", "high"]),
  },
});
console.log(decision.answers.category.choice, decision.requestId);
```

Input is checked before any request is sent, so an invalid question or a
non-finite number in `state` throws `DecisionRequestError` without network
traffic.

#### Policy and audit

A model's answer is an input to a decision, not the decision. Evaluate a
deterministic policy over the answers, and record each decision for audit.
`onDecision` receives a digest of the state, never the state itself, and a
throwing hook fails the call so an unaudited decision is never returned.

```ts
import { evaluateDecision, noul, type DecisionPolicy } from "@frontal-labs/ai";

const policy: DecisionPolicy<{ billing: ReturnType<typeof noul> }> = [
  {
    id: "billing-needs-review",
    question: "billing",
    action: "review",
    reason: "Billing changes are reviewed by a person",
    matches: (answer) => answer.noul > 0.8,
  },
];

const auditTrail: unknown[] = [];
const decision = await ai.decisions.decide(
  {
    model: "frontal-labs/decision-4B",
    state: "I was charged twice.",
    questions: { billing: noul("Is this about billing?") },
  },
  {
    // Store requestId, stateDigest, answers and usage. Never the raw state.
    onDecision: (record) => void auditTrail.push(record),
  },
);

const verdict = evaluateDecision(decision, policy);
if (verdict.action !== "allow") {
  console.log(verdict.matched); // which rules fired, and why
}
```

A rule matches its own question's typed answer, so `answer.noul` is a
compile error on a `choice` question. The verdict is `reject` if any reject
rule fires, otherwise `review` if any review rule fires, otherwise `allow`.

#### Compression

Large states can be compressed with zstd. It is off by default, because the
gateway must accept `Content-Encoding: zstd` request bodies.

```ts
import { createAIClient } from "@frontal-labs/ai";

const compressed = createAIClient({ apiKey: process.env.FRONTAL_API_KEY!, compression: "zstd" });
```

#### Testing

`mockDecisionModel` scripts the decision model at the transport layer, so the
real client, parsing, and validation run in your tests.

```ts
import { createTestHttpClient, mockDecisionModel } from "@frontal-labs/testing";
import { AISdk, noul } from "@frontal-labs/ai";

const model = mockDecisionModel({
  answer: (q) => (q.name === "billing" ? { type: "noul", noul: 0.9 } : { type: "noul", noul: 0.1 }),
});
const { http } = createTestHttpClient(model.routes);
const ai = new AISdk(http);
const result = await ai.decisions.decide({
  model: "frontal-labs/decision-4B",
  state: "charged twice",
  questions: { billing: noul("Is this about billing?") },
});
result.answers.billing.noul; // 0.9
model.calls; // every request the model received
```

### Structured extraction

Extract an intent and typed entities from text, against a vocabulary pinned by
version. Pins are typed: `latest` does not compile.

```ts
const extraction = await ai.extractions.create({
  vocabulary: "support-tasks@1.1.0",
  input: "I was charged twice for invoice INV-2024-0042",
});

extraction.intent; // "billing.refund_request", or null
for (const entity of extraction.entities) {
  // Spans are JavaScript string offsets: the slice is the entity's value.
  extraction.parameters; // slot values keyed by ontology slot name
  console.log(entity.type, entity.value, entity.span);
}
```

`create` sends one `Idempotency-Key` per call and reuses it on retries, so a
retried request is not billed twice. Input is checked before any request:
empty input, NUL, or more than 8000 characters (counted as code points) throws
`ExtractionRequestError`. A span that does not label its value throws
`ExtractionResponseError` rather than return wrong offsets.

The vocabulary the parser serves is available to inspect:

```ts
const served = await ai.extractions.vocabularies.list();
const detail = await ai.extractions.vocabularies.get("support-tasks@1.1.0");
detail.entityTypes; // the entity types the vocabulary defines
```

### Structured output

```ts
const parsed = await ai.generateObject({
  model: "gpt-4o-mini",
  prompt: "Extract severity and service from this report: ...",
  schema: {
    type: "object",
    properties: {
      severity: { type: "string" },
      service: { type: "string" },
    },
    required: ["severity", "service"],
  },
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTAL_API_KEY` | Yes | — | Frontal API authentication key |
| `FRONTAL_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `FRONTAL_DEBUG` | No | `false` | Enable debug logging |
