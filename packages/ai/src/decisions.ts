import type { HttpClient, RequestOptions } from "@frontal-labs/core";
import type { z } from "zod";
import {
  type decisionAnswerWireSchema,
  decisionModelsWireSchema,
  type decisionQuestionWireSchema,
  type decisionRequestWireSchema,
  decisionResponseWireSchema,
} from "./schemas";

/**
 * Typed decision questions for structured-judgment models (`decision-4B`).
 *
 * Holds the question primitives, answer-type inference, local request
 * validation, and the `decide` / `models` client. The answer and envelope
 * shapes are provisional until the gateway contract for `/ai/decisions` is
 * committed (see `schemas.ts`).
 */

/** Yes/no question. The answer is the probability that the statement holds. */
export interface NoulQuestion {
  readonly type: "noul";
  readonly instructions: string;
  readonly criteria?: {
    readonly true?: string | null;
    readonly false?: string | null;
  };
}

/** Single-select question over labelled options. */
export interface ChoiceQuestion<T extends ChoiceCriteria = ChoiceCriteria> {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: T;
}

/** Ordered rubric. The answer is the index of the level that fits best. */
export interface ScoreQuestion<T extends ScoreCriteria = ScoreCriteria> {
  readonly type: "score";
  readonly instructions: string;
  readonly criteria: T;
}

/** Labels mapped to descriptions. A `null` description is allowed. */
export type ChoiceCriteria = Readonly<Record<string, string | null>>;

/** Two or more level descriptions, ordered from lowest to highest. */
export type ScoreCriteria = readonly [string, string, ...string[]];

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type Questions = Readonly<Record<string, Question>>;

/** Yes/no judgment: probability in [0, 1] that the statement holds. */
export interface NoulAnswer {
  readonly type: "noul";
  readonly noul: number;
}

/** Labels are stringified, so numeric keys such as `1` become `"1"`. */
export type ChoiceLabel<T extends ChoiceCriteria> = `${Extract<
  keyof T,
  string | number
>}`;

export interface ChoiceAnswer<T extends ChoiceCriteria = ChoiceCriteria> {
  readonly type: "choice";
  readonly choice: ChoiceLabel<T>;
  readonly probabilities: { readonly [L in ChoiceLabel<T>]: number };
  readonly confidence: number;
}

export interface ScoreAnswer<T extends ScoreCriteria = ScoreCriteria> {
  readonly type: "score";
  /** Index into the criteria, from 0 (lowest) to `criteria.length - 1`. */
  readonly score: number;
  readonly level: T[number];
  readonly probabilities: { readonly [K in keyof T]: number };
  readonly confidence: number;
}

/** Maps each question to its answer type, so results are typed by name. */
export type ResultFor<Q> = Q extends NoulQuestion
  ? NoulAnswer
  : Q extends ChoiceQuestion<infer C extends ChoiceCriteria>
    ? ChoiceAnswer<C>
    : Q extends ScoreQuestion<infer S extends ScoreCriteria>
      ? ScoreAnswer<S>
      : never;

export type Answers<Q extends Questions> = { [K in keyof Q]: ResultFor<Q[K]> };

/** Yes/no question. `instructions` is required so the question is never empty. */
export function noul(
  instructions: string,
  criteria?: NoulQuestion["criteria"]
): NoulQuestion {
  return criteria === undefined
    ? { type: "noul", instructions }
    : { type: "noul", instructions, criteria };
}

/** Single-select question. Answer types are inferred from the label keys. */
export function choice<const T extends ChoiceCriteria>(
  instructions: string,
  criteria: T
): ChoiceQuestion<T> {
  return { type: "choice", instructions, criteria };
}

/**
 * Ordered rubric question. Levels are typed as a tuple, so a `null` level or a
 * list of fewer than two levels is a compile error.
 */
export function score<const T extends ScoreCriteria>(
  instructions: string,
  criteria: T
): ScoreQuestion<T> {
  return { type: "score", instructions, criteria };
}

/** One problem found by local validation, with the path to the bad value. */
export interface DecisionIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Thrown before any request is sent when the input breaks a rule the model
 * would refuse. Carries every issue found, not only the first.
 */
export class DecisionRequestError extends Error {
  readonly issues: readonly DecisionIssue[];

  constructor(issues: readonly DecisionIssue[]) {
    super(
      `Invalid decision request: ${issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")}`
    );
    this.name = "DecisionRequestError";
    this.issues = issues;
  }
}

const isBlank = (value: unknown): boolean =>
  typeof value !== "string" || value.trim().length === 0;

/** Checks question definitions against the rules the model enforces. */
export function validateQuestions(questions: Questions): DecisionIssue[] {
  const issues: DecisionIssue[] = [];
  const names = Object.keys(questions);
  if (names.length === 0) {
    issues.push({ path: "questions", message: "must not be empty" });
  }
  for (const name of names) {
    const question = questions[name];
    const path = `questions.${name}`;
    if (name.trim().length === 0) {
      issues.push({ path: "questions", message: "names must not be blank" });
    }
    if (question === undefined || question === null) {
      issues.push({ path, message: "must be a question" });
      continue;
    }
    if (question.type === "noul") {
      // A noul needs instructions, criteria, or both.
      const criteria = question.criteria;
      const hasCriteria =
        criteria !== undefined &&
        (criteria.true != null || criteria.false != null);
      if (isBlank(question.instructions) && !hasCriteria) {
        issues.push({
          path,
          message: "needs instructions or a criteria description",
        });
      }
    } else if (question.type === "choice") {
      if (isBlank(question.instructions)) {
        issues.push({ path, message: "instructions must be non-empty text" });
      }
      if (Object.keys(question.criteria).length === 0) {
        issues.push({ path, message: "needs at least one choice label" });
      }
    } else if (question.type === "score") {
      if (isBlank(question.instructions)) {
        issues.push({ path, message: "instructions must be non-empty text" });
      }
      const levels = question.criteria as readonly unknown[];
      if (levels.length < 2) {
        issues.push({ path, message: "needs at least two score levels" });
      }
      levels.forEach((level, index) => {
        if (isBlank(level)) {
          issues.push({
            path: `${path}.criteria[${index}]`,
            message: "must be non-empty text, not null",
          });
        }
      });
    }
  }
  return issues;
}

/**
 * Walks the state and reports values JSON cannot carry: `NaN`, `Infinity`,
 * and cycles. JSON would turn `NaN` into `null` silently.
 */
export function validateState(state: unknown): DecisionIssue[] {
  if (state === null || state === undefined) {
    return [{ path: "state", message: "must be provided" }];
  }
  const issues: DecisionIssue[] = [];
  const seen = new WeakSet<object>();
  // Path segments are kept as a stack and joined only when an issue is found,
  // so a clean walk allocates no path strings.
  const trail: (string | number)[] = [];
  const pathOf = (): string =>
    trail.reduce<string>(
      (path, segment) =>
        typeof segment === "number"
          ? `${path}[${segment}]`
          : `${path}.${segment}`,
      "state"
    );
  const walk = (value: unknown): void => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        issues.push({ path: pathOf(), message: "must be a finite number" });
      }
      return;
    }
    if (typeof value !== "object" || value === null) return;
    if (seen.has(value)) {
      issues.push({ path: pathOf(), message: "must not contain cycles" });
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        trail.push(i);
        walk(value[i]);
        trail.pop();
      }
    } else {
      for (const key of Object.keys(value)) {
        trail.push(key);
        walk((value as Record<string, unknown>)[key]);
        trail.pop();
      }
    }
    seen.delete(value);
  };
  walk(state);
  return issues;
}

/**
 * Validates a whole decision request. Throws {@link DecisionRequestError}
 * listing every issue, so no request is sent for input the model would reject.
 */
export function assertValidDecision(
  state: unknown,
  questions: Questions
): void {
  const issues = [...validateState(state), ...validateQuestions(questions)];
  if (issues.length > 0) throw new DecisionRequestError(issues);
}

/** Input to {@link DecisionsResource.decide}. */
export interface DecideRequest<Q extends Questions> {
  /** Model id, for example `frontal-labs/decision-4B`. */
  readonly model: string;
  /**
   * Text or JSON the questions are asked about. Objects are serialized to JSON
   * once, before sending.
   */
  readonly state: unknown;
  readonly questions: Q;
}

export interface DecisionUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  /** Input tokens served from the gateway's prompt cache, when reported. */
  readonly cachedTokens: number | null;
}

/** Answers keyed by question name, plus the model and request id for audit. */
export interface DecisionResult<Q extends Questions> {
  readonly answers: Answers<Q>;
  readonly model: string;
  readonly requestId: string;
  readonly usage: DecisionUsage;
}

/** Options for {@link DecisionsResource.decide}. */
export interface DecideOptions extends RequestOptions {
  /**
   * Called once with an audit record after a successful decision. The record
   * holds a digest of the state, not the state, so it is safe to store. An
   * error thrown here fails the call: an unaudited decision is not returned.
   */
  readonly onDecision?: (record: DecisionAuditRecord) => void | Promise<void>;
}

/** Audit record for one decision. Contains a digest of the state, not the state. */
export interface DecisionAuditRecord {
  readonly requestId: string;
  readonly model: string;
  /** Lowercase hex SHA-256 of the serialized state exactly as sent. */
  readonly stateDigest: string;
  /** Question name and type, in request order. */
  readonly questions: readonly {
    readonly name: string;
    readonly type: string;
  }[];
  readonly answers: Readonly<Record<string, unknown>>;
  readonly usage: DecisionUsage;
  /** ISO 8601 time the decision was received. */
  readonly recordedAt: string;
}

export interface DecisionModel {
  readonly name: string;
  readonly description: string;
  readonly releaseDate: string;
}

/**
 * Thrown when the response does not match the questions that were asked: a
 * missing, duplicate, or unexpected answer, or an answer of the wrong type.
 */
export class DecisionResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionResponseError";
  }
}

type DecisionRequestWire = z.input<typeof decisionRequestWireSchema>;
type DecisionQuestionWire = z.input<typeof decisionQuestionWireSchema>;
type DecisionAnswerWire = z.infer<typeof decisionAnswerWireSchema>;

/**
 * Typed client for structured decisions. Reached as `ai.decisions`.
 *
 * Decisions are read-only, so a call may be retried safely; the call sets
 * `retry.idempotent` for that reason.
 */
export class DecisionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Answers the questions about `state`. Input is validated locally first, so
   * an invalid request sends nothing.
   *
   * @throws {DecisionRequestError} The input breaks a rule. No request is sent.
   * @throws {DecisionResponseError} The answers don't match the questions.
   */
  async decide<const Q extends Questions>(
    request: DecideRequest<Q>,
    options?: DecideOptions
  ): Promise<DecisionResult<Q>> {
    assertValidDecision(request.state, request.questions);
    const state = serializeState(request.state);
    const body: DecisionRequestWire = {
      model: request.model,
      state,
      questions: Object.entries(request.questions).map(([name, question]) =>
        toWireQuestion(name, question)
      ),
    };
    const { onDecision, ...requestOptions } = options ?? {};
    const wire = await this.http.post(
      "/ai/decisions",
      body,
      decisionResponseWireSchema,
      {
        ...requestOptions,
        // One key per call, reused on retries: the gateway requires it on writes.
        idempotencyKey:
          requestOptions.idempotencyKey ?? globalThis.crypto.randomUUID(),
        retry: { ...requestOptions.retry, idempotent: true },
      }
    );
    // Validated against the questions by indexAnswers. The cast is the one
    // point where the runtime shape becomes the typed mapping.
    const answers = indexAnswers(wire.answers, request.questions) as Answers<Q>;
    const usage: DecisionUsage = {
      inputTokens: wire.usage?.inputTokens ?? null,
      outputTokens: wire.usage?.outputTokens ?? null,
      cachedTokens: wire.usage?.cachedTokens ?? null,
    };
    if (onDecision) {
      await onDecision({
        requestId: wire.requestId,
        model: wire.model,
        stateDigest: await sha256Hex(state),
        questions: Object.entries(request.questions).map(([name, q]) => ({
          name,
          type: q.type,
        })),
        answers,
        usage,
        recordedAt: new Date().toISOString(),
      });
    }
    return { answers, model: wire.model, requestId: wire.requestId, usage };
  }

  /** Lists the decision models available to the account. */
  async models(options?: RequestOptions): Promise<DecisionModel[]> {
    const wire = await this.http.get(
      "/ai/decisions/models",
      undefined,
      decisionModelsWireSchema,
      {},
      options
    );
    return wire.models.map((model) => ({
      name: model.name,
      description: model.description,
      releaseDate: model.releaseDate,
    }));
  }
}

/** Lowercase hex SHA-256 of a string, using the runtime's Web Crypto. */
async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/** Strings pass through; anything else is serialized to JSON once. */
function serializeState(state: unknown): string {
  return typeof state === "string" ? state : JSON.stringify(state);
}

/** Maps a question to its wire form. Names and labels become values. */
function toWireQuestion(
  name: string,
  question: Question
): DecisionQuestionWire {
  switch (question.type) {
    case "noul":
      return {
        name,
        type: "noul",
        instructions: question.instructions,
        criteria: question.criteria
          ? {
              true: question.criteria.true ?? null,
              false: question.criteria.false ?? null,
            }
          : undefined,
      };
    case "choice":
      return {
        name,
        type: "choice",
        instructions: question.instructions,
        criteria: Object.entries(question.criteria).map(
          ([label, description]) => ({ label, description })
        ),
      };
    case "score":
      return {
        name,
        type: "score",
        instructions: question.instructions,
        criteria: [...question.criteria],
      };
    default: {
      // Unreachable while Question is exhaustive. If a new question type is
      // added, this assignment fails to compile instead of sending nothing.
      const unhandled: never = question;
      throw new Error(`Unhandled question: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Indexes the answers by question name in one pass, and checks that each
 * question has exactly one answer of its own type.
 */
function indexAnswers(
  answers: readonly DecisionAnswerWire[],
  questions: Questions
): Record<string, unknown> {
  const byName = new Map<string, DecisionAnswerWire>();
  for (const answer of answers) {
    if (byName.has(answer.name)) {
      throw new DecisionResponseError(
        `Duplicate answer for question "${answer.name}"`
      );
    }
    byName.set(answer.name, answer);
  }

  const result: Record<string, unknown> = {};
  for (const [name, question] of Object.entries(questions)) {
    const answer = byName.get(name);
    if (answer === undefined) {
      throw new DecisionResponseError(`Missing answer for question "${name}"`);
    }
    if (answer.type !== question.type) {
      throw new DecisionResponseError(
        `Answer for "${name}" has type "${answer.type}", expected "${question.type}"`
      );
    }
    result[name] = toAnswer(answer);
  }

  if (byName.size !== Object.keys(questions).length) {
    for (const name of byName.keys()) {
      if (!Object.hasOwn(questions, name)) {
        throw new DecisionResponseError(
          `Unexpected answer for question "${name}"`
        );
      }
    }
  }
  return result;
}

/** Drops the wire-only `name` and turns choice probabilities into a map. */
function toAnswer(answer: DecisionAnswerWire): unknown {
  const { name: _name, ...rest } = answer;
  if (rest.type === "choice") {
    return {
      ...rest,
      probabilities: Object.fromEntries(
        rest.probabilities.map((entry) => [entry.label, entry.probability])
      ),
    };
  }
  return rest;
}
