/**
 * Structured extraction: text in, typed intent and entities out, against a
 * vocabulary pinned by version. Reached as `ai.extractions`.
 *
 * Spans come back as Unicode code points from the gateway. `create` converts
 * them to JavaScript string offsets, so `input.slice(span.start, span.end)`
 * returns the entity's `value`. It also verifies that, and throws if a span does
 * not label its value, rather than return a wrong offset.
 */

import type { HttpClient, RequestOptions } from "@frontal-labs/core";
import { z } from "zod";

/*
 * Wire schemas for `/ai/extractions` and the vocabulary reads. Zod only, so the
 * contract generator can import this module without the client runtime.
 *
 * Each response has two shapes. The `*Spec` schema is what the server sends
 * (snake_case). The `*Wire` schema is what the SDK validates after the client's
 * key transform, which camelCases every key except the top-level keys named in
 * `extractionPreservedKeys`.
 */

/** A pinned vocabulary, `id@x.y.z`. `latest` cannot be expressed. */
export const vocabularyPinPattern = /^[^@]+@\d+\.\d+\.\d+$/;

export const extractionStatusSchema = z.enum([
  "ok",
  "needs_clarification",
  "low_confidence",
]);

/** Zero-based code-point offsets; `end` is exclusive. */
export const extractionSpanSpecSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

export const extractionEntitySpecSchema = z.object({
  type: z.string(),
  value: z.string(),
  span: extractionSpanSpecSchema,
  confidence: z.number().min(0).max(1),
});

export const extractionUsageSpecSchema = z.object({
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
});

export const vocabularyRefSpecSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  checksum: z.string().min(1),
});

/** Clarification as the server sends it; keys are snake_case. */
export const clarificationSpecSchema = z.object({
  ambiguous_slot: z.string(),
  candidates: z.array(z.unknown()),
  question: z.string(),
});

export const extractionResponseSpecSchema = z.object({
  id: z.string().min(1),
  model: z.string(),
  model_version: z.string(),
  vocabulary: vocabularyRefSpecSchema,
  status: extractionStatusSchema,
  intent: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  entities: z.array(extractionEntitySpecSchema),
  parameters: z.record(z.string(), z.unknown()),
  clarification: clarificationSpecSchema.optional(),
  usage: extractionUsageSpecSchema,
});

/** The SDK's view of the response, after `preserveKeys` and camelCasing. */
export const extractionResponseWireSchema = z.object({
  id: z.string().min(1),
  model: z.string(),
  modelVersion: z.string(),
  vocabulary: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
    checksum: z.string().min(1),
  }),
  status: extractionStatusSchema,
  intent: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  entities: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
      span: z.object({
        start: z.number().int().min(0),
        end: z.number().int().min(0),
      }),
      confidence: z.number().min(0).max(1),
    })
  ),
  parameters: z.record(z.string(), z.unknown()),
  clarification: clarificationSpecSchema.optional(),
  usage: z.object({
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
  }),
});

/** The request body the gateway accepts. Snake_case on the wire. */
export const extractionRequestSpecSchema = z
  .object({
    model: z.string().optional(),
    vocabulary: z.string().regex(vocabularyPinPattern),
    vocabulary_checksum: z.string().optional(),
    input: z.string().min(1).max(8000),
  })
  .strict();

export const vocabularyRefListSpecSchema = z.object({
  data: z.array(vocabularyRefSpecSchema),
});

export const vocabularyDetailSpecSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  checksum: z.string().min(1),
  intents: z.array(z.record(z.string(), z.unknown())),
  entity_types: z.array(z.record(z.string(), z.unknown())),
  schema: z.record(z.string(), z.unknown()),
});

/**
 * The vocabulary detail is validated in the shape the server sends, because its
 * top-level keys are preserved; the SDK maps `entity_types` to `entityTypes`.
 */

/** Top-level keys copied through without camelCasing. */
export const extractionPreservedKeys = [
  "parameters",
  "clarification",
  "intents",
  "entity_types",
  "schema",
] as const;

/** The extraction model. Other model ids are refused by the gateway. */
export const EXTRACTION_MODEL = "frontal-labs/extract-4B" as const;

/** The input limit, in Unicode code points. */
export const MAX_EXTRACTION_INPUT = 8000;

/** A pinned vocabulary. `latest` and unversioned names do not type-check. */
export type VocabularyPin = `${string}@${number}.${number}.${number}`;

export interface ExtractionCreateRequest {
  /** Defaults to `frontal-labs/extract-4B`. */
  readonly model?: typeof EXTRACTION_MODEL;
  readonly vocabulary: VocabularyPin;
  /** When set, must equal the served vocabulary's checksum. */
  readonly vocabularyChecksum?: string;
  /** Text to extract from. At most 8000 code points. */
  readonly input: string;
}

export interface ExtractionSpan {
  /** JavaScript string offsets: `input.slice(start, end) === value`. */
  readonly start: number;
  readonly end: number;
}

export interface ExtractionEntity {
  readonly type: string;
  readonly value: string;
  readonly span: ExtractionSpan;
  /** The same span as Unicode code points, as the gateway reports it. */
  readonly codePointSpan: ExtractionSpan;
  readonly confidence: number;
}

export interface ExtractionClarification {
  readonly ambiguousSlot: string;
  readonly candidates: readonly unknown[];
  readonly question: string;
}

export interface ExtractionResult {
  readonly id: string;
  readonly model: typeof EXTRACTION_MODEL;
  /** The served model that produced this result. */
  readonly modelVersion: string;
  readonly vocabulary: {
    readonly id: string;
    readonly version: string;
    readonly checksum: string;
  };
  readonly status: "ok" | "needs_clarification" | "low_confidence";
  readonly intent: string | null;
  readonly confidence: number;
  readonly entities: readonly ExtractionEntity[];
  /** Slot values keyed by ontology slot name, for example `invoice_id`. */
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Present only when `status` is `needs_clarification`. */
  readonly clarification?: ExtractionClarification;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface VocabularyRef {
  readonly id: string;
  readonly version: string;
  readonly checksum: string;
}

export interface VocabularyDetail extends VocabularyRef {
  readonly intents: readonly Record<string, unknown>[];
  readonly entityTypes: readonly Record<string, unknown>[];
  /** The JSON schema the parser validates its output against. */
  readonly schema: Readonly<Record<string, unknown>>;
}

/** The request is invalid. Nothing was sent. */
export class ExtractionRequestError extends Error {
  readonly issues: readonly {
    readonly path: string;
    readonly message: string;
  }[];

  constructor(
    issues: readonly { readonly path: string; readonly message: string }[]
  ) {
    super(
      `Invalid extraction request: ${issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")}`
    );
    this.name = "ExtractionRequestError";
    this.issues = issues;
  }
}

/** The response does not match what the gateway contract allows. */
export class ExtractionResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionResponseError";
  }
}

type RawResponse = z.infer<typeof extractionResponseWireSchema>;
type RawVocabularyDetail = z.infer<typeof vocabularyDetailSpecSchema>;

/** Code-point count, without allocating a copy of the input. */
function codePointCount(text: string): number {
  let count = 0;
  for (const _ of text) count += 1;
  return count;
}

/** Validates a create request before any network call. */
function validateCreate(request: ExtractionCreateRequest): void {
  const issues: { path: string; message: string }[] = [];
  if (!vocabularyPinPattern.test(request.vocabulary)) {
    issues.push({
      path: "vocabulary",
      message: "must be pinned as id@x.y.z (latest is not accepted)",
    });
  }
  if (request.input.trim().length === 0) {
    issues.push({ path: "input", message: "must not be empty" });
  }
  if (request.input.includes("\0")) {
    issues.push({ path: "input", message: "must not contain NUL characters" });
  }
  if (codePointCount(request.input) > MAX_EXTRACTION_INPUT) {
    issues.push({
      path: "input",
      message: `must be at most ${MAX_EXTRACTION_INPUT} characters`,
    });
  }
  if (issues.length > 0) throw new ExtractionRequestError(issues);
}

/**
 * Maps code-point offsets to JavaScript string offsets in one pass. Returns the
 * function that does the lookup, or undefined if the input has no code points
 * beyond the BMP (then the two systems agree and no map is needed).
 */
function codePointToUnit(
  input: string
): ((codePoint: number) => number) | undefined {
  if (!/[\u{10000}-\u{10FFFF}]/u.test(input)) return undefined;
  const offsets: number[] = [];
  let unit = 0;
  for (const character of input) {
    offsets.push(unit);
    unit += character.length;
  }
  offsets.push(unit);
  return (codePoint) => {
    const offset = offsets[codePoint];
    if (offset === undefined) {
      throw new ExtractionResponseError("entity span is outside the input");
    }
    return offset;
  };
}

function toResult(input: string, raw: RawResponse): ExtractionResult {
  const toUnit = codePointToUnit(input);
  const entities = raw.entities.map((entity): ExtractionEntity => {
    const codePointSpan = { start: entity.span.start, end: entity.span.end };
    const span = toUnit
      ? { start: toUnit(codePointSpan.start), end: toUnit(codePointSpan.end) }
      : codePointSpan;
    if (
      span.end < span.start ||
      input.slice(span.start, span.end) !== entity.value
    ) {
      throw new ExtractionResponseError(
        "entity span does not label its value; refusing to return wrong offsets"
      );
    }
    return {
      type: entity.type,
      value: entity.value,
      span,
      codePointSpan,
      confidence: entity.confidence,
    };
  });

  const clarification = raw.clarification
    ? toClarification(raw.clarification)
    : undefined;
  if (raw.status === "needs_clarification" && !clarification) {
    throw new ExtractionResponseError(
      "needs_clarification without a clarification"
    );
  }

  return {
    id: raw.id,
    model: EXTRACTION_MODEL,
    modelVersion: raw.modelVersion,
    vocabulary: raw.vocabulary,
    status: raw.status,
    intent: raw.intent,
    confidence: raw.confidence,
    entities,
    parameters: raw.parameters,
    clarification,
    usage: raw.usage,
  };
}

function toClarification(
  raw: z.infer<typeof clarificationSpecSchema>
): ExtractionClarification {
  return {
    ambiguousSlot: raw.ambiguous_slot,
    candidates: raw.candidates,
    question: raw.question,
  };
}

/** The `extractions` sub-resource of `AISdk`. */
export class ExtractionsResource {
  readonly vocabularies: VocabulariesResource;

  constructor(private readonly http: HttpClient) {
    this.vocabularies = new VocabulariesResource(http);
  }

  /**
   * Extracts intent and entities from `input` against a pinned vocabulary.
   *
   * Idempotent: one `Idempotency-Key` is generated per call and reused on
   * retries, so the gateway never bills a retried request twice. Pass your own
   * `idempotencyKey` in `options` to make a call safe to repeat across processes.
   *
   * @throws {ExtractionRequestError} The request breaks a rule. Nothing was sent.
   * @throws {ExtractionResponseError} The response does not match the contract.
   */
  async create(
    request: ExtractionCreateRequest,
    options?: RequestOptions
  ): Promise<ExtractionResult> {
    validateCreate(request);
    const body = {
      model: request.model ?? EXTRACTION_MODEL,
      vocabulary: request.vocabulary,
      vocabularyChecksum: request.vocabularyChecksum,
      input: request.input,
    };
    const raw = await this.http.post(
      "/ai/extractions",
      body,
      extractionResponseWireSchema,
      {
        ...options,
        idempotencyKey:
          options?.idempotencyKey ?? globalThis.crypto.randomUUID(),
        preserveKeys: extractionPreservedKeys,
        retry: { ...options?.retry, idempotent: true },
      }
    );
    return toResult(request.input, raw);
  }
}

/** `ai.extractions.vocabularies`: the vocabularies extraction can be pinned to. */
export class VocabulariesResource {
  constructor(private readonly http: HttpClient) {}

  /** The vocabulary the parser currently serves. */
  async list(options?: RequestOptions): Promise<readonly VocabularyRef[]> {
    const raw = await this.http.get(
      "/ai/extractions/vocabularies",
      undefined,
      vocabularyRefListSpecSchema,
      {},
      options
    );
    return raw.data.map((vocabulary) => ({
      id: vocabulary.id,
      version: vocabulary.version,
      checksum: vocabulary.checksum,
    }));
  }

  /**
   * One vocabulary and its schema. The pin must name an exact version.
   *
   * @throws {ExtractionRequestError} The pin is not `id@x.y.z`.
   */
  async get(
    pin: VocabularyPin,
    options?: RequestOptions
  ): Promise<VocabularyDetail> {
    if (!vocabularyPinPattern.test(pin)) {
      throw new ExtractionRequestError([
        {
          path: "pin",
          message: "must be pinned as id@x.y.z (latest is not accepted)",
        },
      ]);
    }
    const raw: RawVocabularyDetail = await this.http.get(
      `/ai/extractions/vocabularies/${encodeURIComponent(pin)}`,
      undefined,
      vocabularyDetailSpecSchema,
      {},
      { ...options, preserveKeys: extractionPreservedKeys }
    );
    return {
      id: raw.id,
      version: raw.version,
      checksum: raw.checksum,
      intents: raw.intents,
      entityTypes: raw.entity_types,
      schema: raw.schema,
    };
  }
}
