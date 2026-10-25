import type { MockRoute, RequestLog } from "./index";

/** One question as the SDK sends it. */
export interface MockDecisionQuestion {
  name: string;
  type: "noul" | "choice" | "score";
  instructions: string;
  criteria?: unknown;
}

/**
 * The answer to give for one question. `probabilities` defaults to a uniform
 * distribution, and `confidence` to `0.5`.
 */
export type MockDecisionAnswer =
  | { type: "noul"; noul: number }
  | {
      type: "choice";
      choice: string;
      probabilities?: Record<string, number>;
      confidence?: number;
    }
  | {
      type: "score";
      score: number;
      level?: string;
      probabilities?: number[];
      confidence?: number;
    };

/** A captured decisions request, as the SDK sent it. */
export interface MockDecisionCall {
  model: string;
  state: string;
  questions: MockDecisionQuestion[];
}

export interface MockDecisionOptions {
  /**
   * Answer for each question. Receives the question as sent. By default a
   * `noul` answers `0.5`, a `choice` picks its first label, and a `score`
   * picks its lowest level.
   */
  answer?: (question: MockDecisionQuestion) => MockDecisionAnswer;
  /** Models returned by `GET /ai/decisions/models`. */
  models?: Array<{ name: string; description: string; releaseDate: string }>;
}

/** A scripted decision model. */
export interface MockDecisionModel {
  /** Routes to pass to `createTestClient` / `createMockFetch`. */
  routes: MockRoute[];
  /** Every decisions request the model received, in order. */
  calls: MockDecisionCall[];
}

const DEFAULT_MODELS = [
  {
    name: "frontal-labs/decision-4B",
    description: "Structured decisions",
    releaseDate: "2026-10-01",
  },
];

function labelsOf(criteria: unknown): string[] {
  if (Array.isArray(criteria)) {
    return criteria.map((entry) =>
      typeof entry === "string"
        ? entry
        : String((entry as { label: string }).label)
    );
  }
  return [];
}

function defaultAnswer(question: MockDecisionQuestion): MockDecisionAnswer {
  if (question.type === "noul") return { type: "noul", noul: 0.5 };
  if (question.type === "choice") {
    return { type: "choice", choice: labelsOf(question.criteria)[0] ?? "" };
  }
  return { type: "score", score: 0 };
}

/** Turns an answer into the snake_case wire form the server sends. */
function toWireAnswer(
  question: MockDecisionQuestion,
  answer: MockDecisionAnswer
): Record<string, unknown> {
  if (answer.type === "noul") {
    return { name: question.name, type: "noul", noul: answer.noul };
  }
  if (answer.type === "choice") {
    const labels = labelsOf(question.criteria);
    const probabilities = answer.probabilities ?? uniform(labels);
    return {
      name: question.name,
      type: "choice",
      choice: answer.choice,
      probabilities: Object.entries(probabilities).map(
        ([label, probability]) => ({
          label,
          probability,
        })
      ),
      confidence: answer.confidence ?? 0.5,
    };
  }
  const levels = labelsOf(question.criteria);
  return {
    name: question.name,
    type: "score",
    score: answer.score,
    level: answer.level ?? levels[answer.score] ?? "",
    probabilities: answer.probabilities ?? levels.map(() => 1 / levels.length),
    confidence: answer.confidence ?? 0.5,
  };
}

function uniform(labels: string[]): Record<string, number> {
  return Object.fromEntries(labels.map((label) => [label, 1 / labels.length]));
}

/**
 * Creates a scripted decision model for `@frontal-labs/ai`. The routes answer
 * `POST /ai/decisions` and `GET /ai/decisions/models` with the server's
 * snake_case envelope, so the SDK's real parsing and validation run.
 *
 * @example
 * ```ts
 * const model = mockDecisionModel({
 *   answer: (q) =>
 *     q.name === "billing" ? { type: "noul", noul: 0.9 } : { type: "noul", noul: 0.1 },
 * });
 * const { client } = createTestClient(model.routes);
 * ```
 */
export function mockDecisionModel(
  options: MockDecisionOptions = {}
): MockDecisionModel {
  const calls: MockDecisionCall[] = [];
  let sequence = 0;

  const decide: MockRoute = {
    method: "POST",
    path: "/ai/decisions",
    handler: (request: RequestLog) => {
      const body = request.body as MockDecisionCall;
      calls.push({
        model: body.model,
        state: body.state,
        questions: body.questions,
      });
      sequence += 1;
      const answer = options.answer ?? defaultAnswer;
      return Response.json({
        model: body.model,
        request_id: `req_mock_${sequence}`,
        usage: { input_tokens: 1, output_tokens: 1 },
        answers: body.questions.map((question) =>
          toWireAnswer(question, answer(question))
        ),
      });
    },
  };

  const models: MockRoute = {
    method: "GET",
    path: "/ai/decisions/models",
    body: {
      models: (options.models ?? DEFAULT_MODELS).map((model) => ({
        name: model.name,
        description: model.description,
        release_date: model.releaseDate,
      })),
    },
  };

  return { routes: [decide, models], calls };
}
