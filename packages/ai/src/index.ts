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
  ExtractionClarification,
  ExtractionCreateRequest,
  ExtractionEntity,
  ExtractionResult,
  ExtractionSpan,
  VocabularyDetail,
  VocabularyPin,
  VocabularyRef,
} from "./extractions";
export {
  EXTRACTION_MODEL,
  ExtractionRequestError,
  ExtractionResponseError,
  ExtractionsResource,
  MAX_EXTRACTION_INPUT,
  VocabulariesResource,
} from "./extractions";
export type {
  DecisionAction,
  DecisionPolicy,
  DecisionRule,
  DecisionRuleMatch,
  DecisionVerdict,
} from "./policy";
export { evaluateDecision } from "./policy";
// Schemas
export {
  type AIConfig,
  aiConfigSchema,
  type ChatCompletionChunk,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
  type ChatMessage,
  chatCompletionChunkSchema,
  chatCompletionRequestSchema,
  chatCompletionResponseSchema,
  chatMessageSchema,
  decisionAnswerWireSchema,
  // Decision wire schemas
  decisionChoiceLabelWireSchema,
  decisionLabelProbabilityWireSchema,
  decisionModelSpecSchema,
  decisionModelsSpecSchema,
  decisionModelsWireSchema,
  decisionQuestionWireSchema,
  decisionRequestWireSchema,
  decisionResponseSpecSchema,
  decisionResponseWireSchema,
  type GenerateObjectOptions,
  type GenerateObjectResult,
  type GenerateTextOptions,
  type GenerateTextResult,
  generateObjectOptionsSchema,
  generateTextOptionsSchema,
  generateTextResultSchema,
  type Message,
  messageSchema,
  type Prompt,
  type PromptChain,
  type StreamTextOptions,
  type StreamTextResult,
  streamTextOptionsSchema,
  type Tool,
  type ToolLoopStep,
  type ToolResult,
  type VariableDefinition,
} from "./schemas";
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
