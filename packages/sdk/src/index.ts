/**
 * @frontal-labs/sdk
 *
 * Unified Frontal SDK — access all services from a single client.
 */

export type {
  EntityCreate,
  EntityHandle,
  EntityRead,
  EntityRelations,
  EntityUpdate,
  EntityWithRelations,
  FieldKind,
  FieldSpec,
  OntologyClient,
  OntologyDefinition,
  OntologyRuntime,
  OntologyRuntimeArgs,
  RelationSpec,
  UntypedOntology,
} from "@frontal-labs/ontology";
/**
 * The ontology of this application. A generated `ontology.d.ts` augments this
 * interface (`declare module "@frontal-labs/sdk"`), so `new Frontal(...)` and
 * `frontal` are typed without importing a generated client. With no
 * augmentation it is empty and the client is untyped.
 *
 * It is declared here rather than re-exported, because TypeScript merges a
 * module augmentation only into the declaration the module itself defines.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmented by generated code
export interface FrontalOntologyRegistry {}

export { createFrontalClient, frontal } from "./client";
export {
  type FrontalClientConfig,
  type FrontalEnvironment,
  resolveSdkConfig,
  type SdkConfig,
  sdkConfigSchema,
} from "./config";
export { DEFAULT_BASE_URL, VERSION } from "./constants";
export { Frontal } from "./sdk";

// ── Core primitives ────────────────────────────────────────────────────

export {
  CircuitBreakerOpenError,
  type ClientConfigInput,
  type ClientConfigOutput,
  ConflictError,
  clientConfigSchema,
  describeSdkError,
  ForbiddenError,
  FrontalClient,
  FrontalError,
  getDefaultClient,
  HttpClient,
  initTracing,
  NetworkError,
  NotFoundError,
  PreconditionFailedError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "@frontal-labs/core";

// ── Commonly needed helpers ────────────────────────────────────────────

export {
  type AgentDefinitionOptions,
  toApprovalStep,
} from "@frontal-labs/agents";
export {
  parseToolInput,
  type ToolCall,
  type ToolDefinition,
  type ToolSet,
  tool,
  toUIMessageStreamResponse,
  type UIMessage,
  type UIMessagePart,
} from "@frontal-labs/ai";
export {
  isFrontalError,
  isRetryableError,
  registerTelemetry,
  requestIdOf,
  type SdkError,
  type SdkErrorDiagnostics,
  type StreamPart,
  type TelemetryEvent,
  type TelemetryProvider,
} from "@frontal-labs/core";

// ── Individual singletons (tree-shakeable) ─────────────────────────────
//
// @deprecated These env-driven Proxy singletons are kept for back-compat.
// Prefer `new Frontal({ apiKey })` or `createXClient(f.client)` so config
// is explicit. They will not be removed without a major version bump.

export { agents } from "@frontal-labs/agents";
export { ai } from "@frontal-labs/ai";
export { audit } from "@frontal-labs/audit";
export { auth } from "@frontal-labs/auth";
export { billing } from "@frontal-labs/billing";
export { blob } from "@frontal-labs/blob";
export { connectors } from "@frontal-labs/connectors";
export { data } from "@frontal-labs/data";
export { functions } from "@frontal-labs/functions";
export { governance } from "@frontal-labs/governance";
export { lineage } from "@frontal-labs/lineage";
export { observability } from "@frontal-labs/observability";
export { ontology } from "@frontal-labs/ontology";
export { pipelines } from "@frontal-labs/pipelines";
export { schedules } from "@frontal-labs/schedules";
export { webhooks } from "@frontal-labs/webhooks";
export { workflows } from "@frontal-labs/workflows";
