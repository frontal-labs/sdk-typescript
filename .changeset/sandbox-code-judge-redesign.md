---
"@frontal-labs/sandbox": major
---

Redesign the sandbox client to match the real backend. The Frontal sandbox is a
**compile-and-judge** engine, not a VM/file manager. The fabricated
`sandboxes`/`templates`/`files`/`executions` surface (create/start/stop/snapshot/
files) is removed and replaced with the real API:

- `languages()` → `GET /v1/sandbox/languages`
- `selfTest({ language, code, stdin?, tier?, resources? })` → `POST /v1/sandbox/self-test`
  → `{ compile, summary }`
- `submit({ language, code, judge?, task/cases, resourceLimits?, tier? })`
  → `POST /v1/sandbox/submit` → `{ compile, cases[], summary }`

(The sandbox service serves at its root; the gateway strips the public
`/v1/sandbox` prefix before proxying.)
