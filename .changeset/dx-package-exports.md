---
"@frontal-labs/agents": patch
"@frontal-labs/ai": patch
"@frontal-labs/blob": patch
"@frontal-labs/graph": patch
"@frontal-labs/ontology": patch
"@frontal-labs/pipelines": patch
"@frontal-labs/workflows": patch
---

Fix `main`/`exports.require` pointing at `dist/index.cjs`, which tsup never emitted for these packages (CommonJS consumers got a missing-file error). They now point at the emitted `dist/index.js`.
