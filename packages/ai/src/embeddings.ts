/**
 * Embeddings: text in, vectors out, on the OpenAI-compatible `/v1/embeddings`
 * route of the AI gateway. Reached as `ai.embeddings`.
 *
 * Results come back in input order, and every vector is checked against the
 * request (count, indices, length) before it is returned.
 */

import type { HttpClient, RequestOptions } from "@frontal-labs/core";
import { z } from "zod";

/*
 * Wire schemas for `/v1/embeddings`. Zod only, so the contract generator can
 * import this module without the client runtime.
 *
 * The `*Spec` schemas are what the gateway sends and accepts (snake_case). The
 * `*Wire` schemas are what the SDK validates after the client's key transform,
 * which camelCases every key.
 */

export const embeddingEncodingFormatSpecSchema = z.enum(["float", "base64"]);

/** The request body the gateway accepts. Snake_case on the wire. */
export const embeddingRequestSpecSchema = z
  .object({
    model: z.string().min(1),
    input: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    dimensions: z.number().int().min(1).optional(),
    encoding_format: embeddingEncodingFormatSpecSchema.optional(),
    user: z.string().min(1).optional(),
  })
  .strict();

const embeddingVectorSchema = z.union([z.array(z.number()), z.string()]);

export const embeddingResponseSpecSchema = z.object({
  model: z.string(),
  data: z.array(
    z.object({
      index: z.number().int().min(0),
      embedding: embeddingVectorSchema,
    })
  ),
  usage: z.object({
    prompt_tokens: z.number().int().min(0),
    total_tokens: z.number().int().min(0),
  }),
});

/** The SDK's view of the response, after camelCasing. */
export const embeddingResponseWireSchema = z.object({
  model: z.string(),
  data: z.array(
    z.object({
      index: z.number().int().min(0),
      embedding: embeddingVectorSchema,
    })
  ),
  usage: z.object({
    promptTokens: z.number().int().min(0),
    totalTokens: z.number().int().min(0),
  }),
});

export type EmbeddingEncodingFormat = "float" | "base64";

export interface EmbeddingUsage {
  readonly promptTokens: number;
  readonly totalTokens: number;
}

export interface EmbeddingCreateRequest {
  /** Embedding model id, as the gateway names it. Required. */
  readonly model: string;
  /** One string, or a batch. Results keep this order. */
  readonly input: string | readonly string[];
  /** Truncate each vector to this many dimensions. Must be positive. */
  readonly dimensions?: number;
  /** `float` (default) returns `number[]`; `base64` returns the encoded string. */
  readonly encodingFormat?: EmbeddingEncodingFormat;
  /** An end-user identifier, forwarded to the gateway for abuse monitoring. */
  readonly user?: string;
}

export interface EmbeddingItem<V> {
  /** Position of the input this vector belongs to. */
  readonly index: number;
  readonly embedding: V;
}

/** The raw `/v1/embeddings` result, one item per input, in input order. */
export interface EmbeddingResponse<V> {
  readonly model: string;
  readonly data: readonly EmbeddingItem<V>[];
  readonly usage: EmbeddingUsage;
}

export interface EmbedRequest {
  readonly model: string;
  /** A single text. */
  readonly input: string;
  readonly dimensions?: number;
  readonly user?: string;
}

/** The vector for one text. */
export interface Embedding {
  readonly embedding: readonly number[];
  readonly model: string;
  readonly usage: EmbeddingUsage;
}

export interface EmbedManyRequest {
  readonly model: string;
  /** Texts to embed. Results keep this order. */
  readonly input: readonly string[];
  readonly dimensions?: number;
  readonly user?: string;
}

/** The vectors for a batch, in the same order as the input. */
export interface EmbeddingBatch {
  readonly embeddings: readonly (readonly number[])[];
  readonly model: string;
  readonly usage: EmbeddingUsage;
}

/** The request is invalid. Nothing was sent. */
export class EmbeddingRequestError extends Error {
  readonly issues: readonly {
    readonly path: string;
    readonly message: string;
  }[];

  constructor(
    issues: readonly { readonly path: string; readonly message: string }[]
  ) {
    super(
      `Invalid embedding request: ${issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")}`
    );
    this.name = "EmbeddingRequestError";
    this.issues = issues;
  }
}

/** The response does not match the request or the gateway contract. */
export class EmbeddingResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingResponseError";
  }
}

interface Issue {
  path: string;
  message: string;
}
type RawResponse = z.infer<typeof embeddingResponseWireSchema>;

/** Checks a request before any network call. */
function validateCreate(request: EmbeddingCreateRequest): void {
  const issues: Issue[] = [];
  if (request.model.trim().length === 0) {
    issues.push({ path: "model", message: "must not be empty" });
  }
  const inputs =
    typeof request.input === "string" ? [request.input] : request.input;
  if (inputs.length === 0) {
    issues.push({ path: "input", message: "must contain at least one text" });
  }
  inputs.forEach((text, position) => {
    const path =
      typeof request.input === "string" ? "input" : `input[${position}]`;
    if (text.trim().length === 0) {
      issues.push({ path, message: "must not be empty" });
    }
    if (text.includes("\0")) {
      issues.push({ path, message: "must not contain NUL characters" });
    }
  });
  if (
    request.dimensions !== undefined &&
    (!Number.isInteger(request.dimensions) || request.dimensions < 1)
  ) {
    issues.push({ path: "dimensions", message: "must be a positive integer" });
  }
  if (issues.length > 0) throw new EmbeddingRequestError(issues);
}

/** Checks a response against the request, then returns it in input order. */
function toOrderedItems<V>(
  raw: RawResponse,
  expectedCount: number,
  dimensions: number | undefined
): EmbeddingItem<V>[] {
  if (raw.data.length !== expectedCount) {
    throw new EmbeddingResponseError(
      `expected ${expectedCount} embeddings, got ${raw.data.length}`
    );
  }
  const items = [...raw.data].sort((a, b) => a.index - b.index);
  items.forEach((item, position) => {
    if (item.index !== position) {
      throw new EmbeddingResponseError(
        "embedding indices must be 0 through n-1, each exactly once"
      );
    }
    if (Array.isArray(item.embedding)) {
      if (dimensions !== undefined && item.embedding.length !== dimensions) {
        throw new EmbeddingResponseError(
          `embedding ${position} has ${item.embedding.length} dimensions, expected ${dimensions}`
        );
      }
      if (
        position > 0 &&
        Array.isArray(items[0]?.embedding) &&
        items[0].embedding.length !== item.embedding.length
      ) {
        throw new EmbeddingResponseError(
          "embeddings in one response have different lengths"
        );
      }
    }
  });
  return items as EmbeddingItem<V>[];
}

/** The `embeddings` sub-resource of `AISdk`. */
export class EmbeddingsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * The raw embeddings call. The return type follows `encodingFormat`:
   * `base64` gives strings, anything else gives number arrays.
   *
   * Idempotent: one `Idempotency-Key` is generated per call and reused on
   * retries, so a retried request is not charged twice. Pass your own
   * `idempotencyKey` in `options` to make a call safe to repeat across processes.
   *
   * @throws {EmbeddingRequestError} The request breaks a rule. Nothing was sent.
   * @throws {EmbeddingResponseError} The response does not match the request.
   */
  create(
    request: EmbeddingCreateRequest & { readonly encodingFormat: "base64" },
    options?: RequestOptions
  ): Promise<EmbeddingResponse<string>>;
  create(
    request: EmbeddingCreateRequest & { readonly encodingFormat?: "float" },
    options?: RequestOptions
  ): Promise<EmbeddingResponse<number[]>>;
  /** A request whose format is only known at runtime; the vector is `number[] | string`. */
  create(
    request: EmbeddingCreateRequest,
    options?: RequestOptions
  ): Promise<EmbeddingResponse<number[] | string>>;
  async create(
    request: EmbeddingCreateRequest,
    options?: RequestOptions
  ): Promise<EmbeddingResponse<number[] | string>> {
    validateCreate(request);
    const inputs =
      typeof request.input === "string" ? [request.input] : request.input;
    const body = {
      model: request.model,
      input: request.input,
      dimensions: request.dimensions,
      encodingFormat: request.encodingFormat,
      user: request.user,
    };
    const raw = await this.http.post(
      "/v1/embeddings",
      body,
      embeddingResponseWireSchema,
      {
        ...options,
        idempotencyKey:
          options?.idempotencyKey ?? globalThis.crypto.randomUUID(),
        retry: { ...options?.retry, idempotent: true },
      }
    );
    return {
      model: raw.model,
      data: toOrderedItems<number[] | string>(
        raw,
        inputs.length,
        request.dimensions
      ),
      usage: {
        promptTokens: raw.usage.promptTokens,
        totalTokens: raw.usage.totalTokens,
      },
    };
  }

  /** The vector for one text. */
  async embed(
    request: EmbedRequest,
    options?: RequestOptions
  ): Promise<Embedding> {
    const result = await this.create(
      {
        model: request.model,
        input: request.input,
        dimensions: request.dimensions,
        user: request.user,
        encodingFormat: "float",
      },
      options
    );
    const [item] = result.data as EmbeddingItem<number[]>[];
    if (!item) throw new EmbeddingResponseError("no embedding returned");
    return {
      embedding: item.embedding,
      model: result.model,
      usage: result.usage,
    };
  }

  /** The vectors for a batch, in the same order as `input`. */
  async embedMany(
    request: EmbedManyRequest,
    options?: RequestOptions
  ): Promise<EmbeddingBatch> {
    const result = await this.create(
      {
        model: request.model,
        input: request.input,
        dimensions: request.dimensions,
        user: request.user,
        encodingFormat: "float",
      },
      options
    );
    return {
      embeddings: (result.data as EmbeddingItem<number[]>[]).map(
        (item) => item.embedding
      ),
      model: result.model,
      usage: result.usage,
    };
  }
}
