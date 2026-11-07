// Each entry bundles with esbuild. `testing` assigns process.env.NODE_ENV,
// which esbuild warns about because size-limit defines it; the warning is
// expected for that package, so it is silenced here rather than in its source.
const silenceDefineAssign = (config) => ({
  ...config,
  logOverride: { ...config.logOverride, "assign-to-define": "silent" },
});

export default [
  {
    "name": "agents",
    "path": "packages/agents/dist/index.js",
    "limit": "76 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "ai",
    "path": "packages/ai/dist/index.js",
    "limit": "81 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "audit",
    "path": "packages/audit/dist/index.js",
    "limit": "65 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "auth",
    "path": "packages/auth/dist/index.js",
    "limit": "67 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "blob",
    "path": "packages/blob/dist/index.js",
    "limit": "74 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "connectors",
    "path": "packages/connectors/dist/index.js",
    "limit": "66 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "core",
    "path": "packages/core/dist/index.js",
    "limit": "65 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "data",
    "path": "packages/data/dist/index.js",
    "limit": "65 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "functions",
    "path": "packages/functions/dist/index.js",
    "limit": "66 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "governance",
    "path": "packages/governance/dist/index.js",
    "limit": "68 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "lineage",
    "path": "packages/lineage/dist/index.js",
    "limit": "65 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "observability",
    "path": "packages/observability/dist/index.js",
    "limit": "66 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "ontology",
    "path": "packages/ontology/dist/index.js",
    "limit": "80 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "pipelines",
    "path": "packages/pipelines/dist/index.js",
    "limit": "75 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "react",
    "path": "packages/react/dist/index.js",
    "ignore": [
      "react",
      "react-dom"
    ],
    "limit": "73 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "schedules",
    "path": "packages/schedules/dist/index.js",
    "limit": "66 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "sdk",
    "path": "packages/sdk/dist/index.js",
    "limit": "97 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "testing",
    "path": "packages/testing/dist/index.js",
    "limit": "152 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "webhooks",
    "path": "packages/webhooks/dist/index.js",
    "limit": "66 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "workflows",
    "path": "packages/workflows/dist/index.js",
    "limit": "76 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "sdk: new Frontal()",
    "path": "packages/sdk/dist/index.js",
    "import": "{ Frontal }",
    "limit": "96 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "core: FrontalClient",
    "path": "packages/core/dist/index.js",
    "import": "{ FrontalClient }",
    "limit": "64 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "blob: createBlobClient",
    "path": "packages/blob/dist/index.js",
    "import": "{ createBlobClient }",
    "limit": "74 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  },
  {
    "name": "react: useChat",
    "path": "packages/react/dist/index.js",
    "import": "{ useChat }",
    "ignore": [
      "react",
      "react-dom"
    ],
    "limit": "72 kB",
    "modifyEsbuildConfig": silenceDefineAssign
  }
];
