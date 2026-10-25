---
"@frontal-labs/ai": minor
"@frontal-labs/testing": minor
---

Breaking: the AI SDK no longer calls the gateway's `/internal/*` routes. Removed `embed`, `generateSpeech`, `generateImage`, `generateVideo`, `transcribe`, `moderate`, `listModels`, `getDefaultModels` and `rerank`, with their option and result types. `generateText`, `streamText`, `generateObject` and `health` are unchanged. Under 0.x semver this is a breaking change released as a minor bump.

- `ai.decisions.decide({ model, state, questions })` answers typed `noul`, `choice` and `score` questions. Answers are typed per question name, and the result carries `requestId`, `model` and `usage` (including `cachedTokens` when reported). Input is validated before any request is sent (`DecisionRequestError`). A response that doesn't match the questions raises `DecisionResponseError`.
- `ai.decisions.models()` lists the decision models.
- `onDecision` audit hook: receives a record with a SHA-256 digest of the state, never the state. A throwing hook fails the call.
- `evaluateDecision(result, policy)` evaluates typed rules over the answers and returns `allow`, `review` or `reject`, with every rule that fired and its reason.
- `createAIClient({ compression: "zstd" })` compresses large request bodies. Off by default.
- The decisions routes and schemas are in `contracts/openapi/ai.openapi.json`, generated from the Zod wire schemas.
- Testing: `mockDecisionModel` scripts the decision model at the transport layer. The scenario aliases `ai.decisions.decide` and `ai.decisions.models` replace the removed `ai.embed` and `ai.listModels`.
