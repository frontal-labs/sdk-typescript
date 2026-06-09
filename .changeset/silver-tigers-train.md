---
"@frontal-labs/sdk": patch
---

Initial release of the unified SDK umbrella package. Provides a single
`Sdk` class with lazy accessors for all 25 Frontal services, plus a
`createSdkClient()` factory and tree-shakeable individual singletons.
