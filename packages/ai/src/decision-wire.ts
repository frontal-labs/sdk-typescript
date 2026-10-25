/**
 * Wire schemas for the decisions endpoint (`/ai/decisions`,
 * `/ai/decisions/models`).
 *
 * This module depends only on Zod, so the contract generator can import it
 * without loading the client runtime. `scripts/generate-decisions-openapi.ts`
 * derives the committed OpenAPI fragment from these schemas.
 *
 * User-defined names and labels travel as string values inside arrays, never
 * as object keys, so the snake_case/camelCase transform only renames the fixed
 * field names below and cannot rewrite user data.
 */

import { z } from "zod";

/** A labelled choice option. The label is a value, not a key. */
export const decisionChoiceLabelWireSchema = z.object({
  label: z.string().min(1),
  description: z.string().nullable(),
});

/** Question as sent to the decisions endpoint. */
export const decisionQuestionWireSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["noul", "choice", "score"]),
  instructions: z.string(),
  criteria: z
    .union([
      z.object({
        true: z.string().nullable().optional(),
        false: z.string().nullable().optional(),
      }),
      z.array(decisionChoiceLabelWireSchema),
      z.array(z.string()),
    ])
    .optional(),
});

/** Probability of one choice label. */
export const decisionLabelProbabilityWireSchema = z.object({
  label: z.string().min(1),
  probability: z.number().min(0).max(1),
});

/** One answer, tagged with the question name it answers. */
export const decisionAnswerWireSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().min(1),
    type: z.literal("noul"),
    noul: z.number().min(0).max(1),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("choice"),
    choice: z.string().min(1),
    probabilities: z.array(decisionLabelProbabilityWireSchema),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("score"),
    score: z.number().int().min(0),
    level: z.string(),
    probabilities: z.array(z.number().min(0).max(1)),
    confidence: z.number().min(0).max(1),
  }),
]);

/**
 * Request body for the decisions endpoint. `state` is serialized text, so its
 * contents are never rewritten by the key transform. The same shape is used on
 * the wire and in the SDK.
 */
export const decisionRequestWireSchema = z.object({
  model: z.string().min(1),
  state: z.string(),
  questions: z.array(decisionQuestionWireSchema).min(1),
});

const decisionUsageFields = {
  input_tokens: z.number().int().nullable().optional(),
  output_tokens: z.number().int().nullable().optional(),
  cached_tokens: z.number().int().nullable().optional(),
};

/**
 * Response as the server sends it (snake_case). This is the contract source
 * for the decisions sections of `contracts/openapi/ai.openapi.json`.
 */
export const decisionResponseSpecSchema = z.object({
  model: z.string(),
  answers: z.array(decisionAnswerWireSchema),
  usage: z.object(decisionUsageFields).optional(),
  request_id: z.string().min(1),
});

/**
 * Response as the SDK validates it, after the client's snake_case to camelCase
 * transform. `decision-wire.test.ts` checks it stays in step with
 * {@link decisionResponseSpecSchema}.
 */
export const decisionResponseWireSchema = z.object({
  model: z.string(),
  answers: z.array(decisionAnswerWireSchema),
  usage: z
    .object({
      inputTokens: z.number().int().nullable().optional(),
      outputTokens: z.number().int().nullable().optional(),
      cachedTokens: z.number().int().nullable().optional(),
    })
    .optional(),
  requestId: z.string().min(1),
});

/** One decision model, as the server sends it. */
export const decisionModelSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  release_date: z.string(),
});

/** Decisions model list, as the server sends it. */
export const decisionModelsSpecSchema = z.object({
  models: z.array(decisionModelSpecSchema),
});

/** Decisions model list, as the SDK validates it after transform. */
export const decisionModelsWireSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string(),
      releaseDate: z.string(),
    })
  ),
});
