/**
 * @frontal-labs/agents
 *
 * Build and deploy intelligent agents on the Frontal platform.
 */

export type { ToolDefinition, ToolSet } from "@frontal-labs/core";
export { parseToolInput, tool, toolSetToRequest } from "@frontal-labs/core";
export { type AgentsClientConfig, agents, createAgentsClient } from "./client";
export { DEFAULT_AGENTS_BASE_URL, VERSION } from "./constants";
export type { AgentContext, AgentHandler } from "./context";
export type {
  AgentDefinitionOptions,
  AgentRuntimeHints,
  ApprovalStepSpec,
} from "./definition";
export { normalizeTriggers, toApprovalStep } from "./definition";
export * from "./schemas";
export type { AgentRunEvent, CreatedAgent } from "./sdk";
export { AgentAccessor, AgentBuilder, AgentsSdk } from "./sdk";
