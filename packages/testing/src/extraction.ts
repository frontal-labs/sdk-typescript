import type { MockRoute, RequestLog } from "./index";

/** An entity to report. The mock finds `value` in the input and reports its span. */
export interface MockEntity {
  readonly type: string;
  readonly value: string;
  readonly confidence?: number;
}

export interface MockExtractionOptions {
  /** Entities to report for an input. Values not found in the input are skipped. */
  entities?: (input: string) => readonly MockEntity[];
  /** The intent to report. Defaults to `null`. */
  intent?: string | null;
  /** The outcome. Defaults to `ok`. */
  status?: "ok" | "needs_clarification" | "low_confidence";
  /** Required with `status: "needs_clarification"`. */
  clarification?: {
    readonly ambiguousSlot: string;
    readonly candidates: readonly unknown[];
    readonly question: string;
  };
  /** Served vocabulary. Defaults to `support-tasks` at `1.1.0`. */
  vocabulary?: {
    readonly id?: string;
    readonly version?: string;
    readonly checksum?: string;
    readonly intents?: readonly Record<string, unknown>[];
    readonly entityTypes?: readonly Record<string, unknown>[];
    readonly schema?: Record<string, unknown>;
  };
}

/** A captured extraction request, as the SDK sent it. */
export interface MockExtractionCall {
  readonly model: string;
  readonly vocabulary: string;
  readonly vocabularyChecksum?: string;
  readonly input: string;
}

/** A scripted extraction model. */
export interface MockExtractionModel {
  /** Routes to pass to `createTestClient` / `createTestHttpClient`. */
  readonly routes: MockRoute[];
  /** Every extraction request the model received, in order. */
  readonly calls: MockExtractionCall[];
}

const DEFAULT_CHECKSUM = "0".repeat(64);

/** Code-point index of a UTF-16 offset: the gateway's span unit. */
function codePointIndex(input: string, unitOffset: number): number {
  return Array.from(input.slice(0, unitOffset)).length;
}

/**
 * Creates a scripted extraction model for `@frontal-labs/ai`. The routes answer
 * `POST /ai/extractions` and the vocabulary reads with the gateway's snake_case
 * contract, so the SDK's real validation and span conversion run.
 *
 * @example
 * ```ts
 * const model = mockExtractionModel({
 *   entities: (input) => [{ type: "invoice_id", value: "INV-2024-0042" }],
 * });
 * ```
 */
export function mockExtractionModel(
  options: MockExtractionOptions = {}
): MockExtractionModel {
  const calls: MockExtractionCall[] = [];
  const vocabulary = {
    id: options.vocabulary?.id ?? "support-tasks",
    version: options.vocabulary?.version ?? "1.1.0",
    checksum: options.vocabulary?.checksum ?? DEFAULT_CHECKSUM,
    intents: options.vocabulary?.intents ?? [],
    entityTypes: options.vocabulary?.entityTypes ?? [],
    schema: options.vocabulary?.schema ?? { type: "object" },
  };
  let sequence = 0;

  const create: MockRoute = {
    method: "POST",
    path: "/ai/extractions",
    handler: (request: RequestLog) => {
      const body = request.body as MockExtractionCall;
      calls.push({
        model: body.model,
        vocabulary: body.vocabulary,
        vocabularyChecksum: body.vocabularyChecksum,
        input: body.input,
      });
      sequence += 1;
      const entities = (options.entities?.(body.input) ?? []).flatMap(
        (entity) => {
          const unit = body.input.indexOf(entity.value);
          if (unit < 0) return [];
          const start = codePointIndex(body.input, unit);
          const end = start + Array.from(entity.value).length;
          return [
            {
              type: entity.type,
              value: entity.value,
              span: { start, end },
              confidence: entity.confidence ?? 0.9,
            },
          ];
        }
      );
      return Response.json({
        id: `extr_mock_${sequence}`,
        model: body.model,
        model_version: "parser-mock",
        vocabulary: {
          id: vocabulary.id,
          version: vocabulary.version,
          checksum: vocabulary.checksum,
        },
        status: options.status ?? "ok",
        intent: options.intent ?? null,
        confidence: 0.9,
        entities,
        parameters: {},
        ...(options.clarification
          ? {
              clarification: {
                ambiguous_slot: options.clarification.ambiguousSlot,
                candidates: options.clarification.candidates,
                question: options.clarification.question,
              },
            }
          : {}),
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    },
  };

  const list: MockRoute = {
    method: "GET",
    path: "/ai/extractions/vocabularies",
    body: {
      data: [
        {
          id: vocabulary.id,
          version: vocabulary.version,
          checksum: vocabulary.checksum,
        },
      ],
    },
  };

  const detail: MockRoute = {
    method: "GET",
    path: "/ai/extractions/vocabularies/{param}",
    body: {
      id: vocabulary.id,
      version: vocabulary.version,
      checksum: vocabulary.checksum,
      intents: vocabulary.intents,
      entity_types: vocabulary.entityTypes,
      schema: vocabulary.schema,
    },
  };

  return { routes: [create, list, detail], calls };
}
