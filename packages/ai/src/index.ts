/**
 * @frontal-labs/ai
 *
 * A powerful, type-safe AI SDK for Frontal
 * Provides unified access to LLMs, embeddings, and more.
 */

export { type AIClientConfig, ai, createAIClient } from "./client";
export { DEFAULT_AI_BASE_URL, VERSION } from "./constants";
export type {
  Answers,
  ChoiceAnswer,
  ChoiceCriteria,
  ChoiceLabel,
  ChoiceQuestion,
  DecideOptions,
  DecideRequest,
  DecisionAuditRecord,
  DecisionIssue,
  DecisionModel,
  DecisionResult,
  DecisionUsage,
  NoulAnswer,
  NoulQuestion,
  Question,
  Questions,
  ResultFor,
  ScoreAnswer,
  ScoreCriteria,
  ScoreQuestion,
} from "./decisions";
export {
  choice,
  DecisionRequestError,
  DecisionResponseError,
  DecisionsResource,
  noul,
  score,
  validateQuestions,
  validateState,
} from "./decisions";
export type {
  DecisionAction,
  DecisionPolicy,
  DecisionRule,
  DecisionRuleMatch,
  DecisionVerdict,
} from "./decisions-policy";
export { evaluateDecision } from "./decisions-policy";
export type { ToolLoopStep, ToolResult } from "./schemas";
export * from "./schemas";
export { AISdk } from "./sdk";
export type {
  StreamControlOptions,
  StreamUsage,
  TextStreamPart,
} from "./stream";
export {
  parseToolInput,
  type ToolCall,
  type ToolChoice,
  type ToolDefinition,
  type ToolSet,
  tool,
  toolSetToRequest,
} from "./tool";
export type {
  UIError,
  UIMessage,
  UIMessagePart,
  UIMessageStreamOptions,
  UIStreamFrame,
} from "./ui";
export {
  applyUIFrame,
  createUIMessage,
  parseUIMessageStream,
  serializeError,
  toUIMessageStreamResponse,
  UI_MESSAGE_STREAM_HEADER,
  UI_MESSAGE_STREAM_VERSION,
} from "./ui";
