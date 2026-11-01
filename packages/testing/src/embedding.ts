import type { MockRoute, RequestLog } from "./index";

export interface MockEmbeddingOptions {
  /** Vector length when the request does not set `dimensions`. Defaults to 8. */
  readonly dimensions?: number;
  /**
   * The vector for one input. Defaults to a deterministic vector derived from
   * the text, so the same input always gets the same embedding.
   */
  readonly vector?: (input: string) => readonly number[];
}

/** A captured embeddings request, as the SDK sent it. */
export interface MockEmbeddingCall {
  readonly model: string;
  readonly input: string | readonly string[];
  readonly dimensions?: number;
  readonly encodingFormat?: "float" | "base64";
  readonly user?: string;
}

/** A scripted embeddings model. */
export interface MockEmbeddingModel {
  /** Routes to pass to `createTestClient` / `createTestHttpClient`. */
  readonly routes: MockRoute[];
  /** Every embeddings request the model received, in order. */
  readonly calls: MockEmbeddingCall[];
}

/** FNV-1a hash of a string, used to seed the default vector. */
function hash(text: string): number {
  let value = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16_777_619) >>> 0;
  }
  return value;
}

/** A deterministic vector in [-1, 1] for `text`. */
function defaultVector(text: string, dimensions: number): number[] {
  const seed = hash(text);
  return Array.from({ length: dimensions }, (_, i) =>
    Math.sin((seed + 1) * (i + 1))
  );
}

/** The wire encoding of a float vector: little-endian float32, base64. */
function toBase64(vector: readonly number[]): string {
  const bytes = new Uint8Array(new Float32Array(vector).buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** A rough token count: one per whitespace-separated word. */
function countTokens(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Creates a scripted embeddings model for `@frontal-labs/ai`. The route answers
 * `POST /v1/embeddings` with the OpenAI-compatible snake_case shape, so the
 * SDK's real validation and ordering run.
 *
 * @example
 * ```ts
 * const model = mockEmbeddingModel({ dimensions: 4 });
 * const { client, mock } = createTestClient(model.routes);
 * ```
 */
export function mockEmbeddingModel(
  options: MockEmbeddingOptions = {}
): MockEmbeddingModel {
  const calls: MockEmbeddingCall[] = [];
  const dimensionsDefault = options.dimensions ?? 8;

  const create: MockRoute = {
    method: "POST",
    path: "/v1/embeddings",
    handler: (request: RequestLog) => {
      const body = request.body as MockEmbeddingCall;
      calls.push({
        model: body.model,
        input: body.input,
        dimensions: body.dimensions,
        encodingFormat: body.encodingFormat,
        user: body.user,
      });
      const inputs = typeof body.input === "string" ? [body.input] : body.input;
      const dimensions = body.dimensions ?? dimensionsDefault;
      const data = inputs.map((text, index) => {
        const vector =
          options.vector?.(text) ?? defaultVector(text, dimensions);
        return {
          object: "embedding",
          index,
          embedding:
            body.encodingFormat === "base64" ? toBase64(vector) : [...vector],
        };
      });
      const tokens = inputs.reduce((sum, text) => sum + countTokens(text), 0);
      return Response.json({
        object: "list",
        data,
        model: body.model,
        usage: { prompt_tokens: tokens, total_tokens: tokens },
      });
    },
  };

  return { routes: [create], calls };
}
