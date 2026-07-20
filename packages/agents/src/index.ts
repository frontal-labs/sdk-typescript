/**
 * @frontal-labs/agents
 *
 * Build and deploy intelligent agents on the Frontal platform.
 */

export { createAgentsClient, agents, type AgentsClientConfig } from "./client";
export { DEFAULT_AGENTS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { AgentsSdk } from "./sdk";
export type { AgentContext, AgentHandler } from "./context";
