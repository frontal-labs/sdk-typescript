/**
 * @frontal-labs/react
 *
 * React hooks for the Frontal SDK. Transport-agnostic: `useChat` talks to
 * any route that returns `toUIMessageStreamResponse(...)`; the other hooks
 * take SDK objects from `new Frontal(...)`.
 */

export type { UIError, UIMessage, UIMessagePart } from "@frontal-labs/ai";
export type {
  AgentRunStatus,
  UseAgentRunOptions,
  UseAgentRunResult,
} from "./use-agent-run";
export { useAgentRun } from "./use-agent-run";
export type {
  ChatStatus,
  ChatTransport,
  UseChatOptions,
  UseChatResult,
} from "./use-chat";
export { useChat } from "./use-chat";
export type {
  UseWorkflowApprovalsOptions,
  UseWorkflowApprovalsResult,
} from "./use-workflow-run";
export { useWorkflowApprovals } from "./use-workflow-run";
