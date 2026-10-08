---
"@frontal-labs/agents": patch
"@frontal-labs/core": patch
"@frontal-labs/webhooks": major
---

Fix shared transport timeouts, SSE parsing, schema validation, retry safety, and
circuit-breaker handling. Make webhook signature verification asynchronous and
Web Crypto based so it works in native Node ESM and Fetch/Web Crypto runtimes.
Callers must now await `verifyWebhookSignature` and `extractWebhookEvent`.
