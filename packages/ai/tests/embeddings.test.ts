/**
 * `ai.embeddings`: request shape, idempotency, input-order results, response
 * checks, local validation, and the type-level encoding overloads.
 */

import { HttpClient } from "@frontal-labs/core";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type Embedding,
  type EmbeddingBatch,
  type EmbeddingCreateRequest,
  type EmbeddingResponse,
  EmbeddingRequestError,
  EmbeddingResponseError,
  EmbeddingsResource,
} from "../src/embeddings";

const base = {
  apiKey: "frt_test1234567890",
  baseUrl: "https://api.test/v1",
  timeout: 1000,
  maxRetries: 0,
  retryDelay: 0,
  headers: {},
  environment: "test",
  debug: false,
};

interface Seen {
  calls: number;
  paths: string[];
  bodies: Record<string, unknown>[];
  keys: (string | null)[];
}

function resource(
  respond: (call: number, body: Record<string, unknown>) => Response,
  config: Partial<typeof base> = {}
) {
  const seen: Seen = { calls: 0, paths: [], bodies: [], keys: [] };
  const http = new HttpClient({
    ...base,
    ...config,
    fetch: async (input, init) => {
      seen.calls += 1;
      seen.paths.push(new URL(String(input)).pathname);
      seen.keys.push(new Headers(init?.headers).get("Idempotency-Key"));
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >;
      seen.bodies.push(body);
      return respond(seen.calls, body);
    },
  });
  return { embeddings: new EmbeddingsResource(http), seen };
}

/** A server response with one vector per input, in the order given. */
function envelope(
  input: string | readonly string[],
  vector: (i: number) => number[] | string = (i) => [i, i + 0.5]
) {
  const inputs = typeof input === "string" ? [input] : input;
  return {
    object: "list",
    model: "embed-small",
    data: inputs.map((_, index) => ({
      object: "embedding",
      index,
      embedding: vector(index),
    })),
    usage: { prompt_tokens: 3, total_tokens: 3 },
  };
}

describe("embeddings: request", () => {
  it("posts to /v1/embeddings in the OpenAI-compatible snake_case shape", async () => {
    const { embeddings, seen } = resource((_, body) =>
      Response.json(envelope(body.input as string[]))
    );
    await embeddings.create({
      model: "embed-small",
      input: ["a", "b"],
      dimensions: 2,
      encodingFormat: "float",
      user: "user_1",
    });
    expect(seen.paths).toEqual(["/v1/embeddings"]);
    expect(seen.bodies[0]).toEqual({
      model: "embed-small",
      input: ["a", "b"],
      dimensions: 2,
      encoding_format: "float",
      user: "user_1",
    });
  });

  it("sends one idempotency key, reused on a retry of the same call", async () => {
    const { embeddings, seen } = resource(
      (call, body) =>
        call === 1
          ? new Response("{}", { status: 503 })
          : Response.json(envelope(body.input as string[])),
      { maxRetries: 1 }
    );
    await embeddings.create({ model: "embed-small", input: "a" });
    expect(seen.calls).toBe(2);
    expect(seen.keys[0]).toBeTruthy();
    expect(seen.keys[1]).toBe(seen.keys[0]);
  });

  it("honours a caller-supplied idempotency key", async () => {
    const { embeddings, seen } = resource((_, body) =>
      Response.json(envelope(body.input as string[]))
    );
    await embeddings.create(
      { model: "embed-small", input: "a" },
      { idempotencyKey: "job-42" }
    );
    expect(seen.keys).toEqual(["job-42"]);
  });
});

describe("embeddings: results", () => {
  it("returns vectors in input order even when the server sends them shuffled", async () => {
    const { embeddings } = resource((_, body) => {
      const inputs = body.input as string[];
      const shuffled = {
        ...envelope(inputs),
        data: [...envelope(inputs).data].reverse(),
      };
      return Response.json(shuffled);
    });
    const result = await embeddings.embedMany({
      model: "embed-small",
      input: ["first", "second", "third"],
    });
    expect(result.embeddings).toEqual([
      [0, 0.5],
      [1, 1.5],
      [2, 2.5],
    ]);
  });

  it("maps usage to camelCase", async () => {
    const { embeddings } = resource((_, body) =>
      Response.json(envelope(body.input as string[]))
    );
    const result = await embeddings.embed({
      model: "embed-small",
      input: "hello",
    });
    expect(result.usage).toEqual({ promptTokens: 3, totalTokens: 3 });
    expect(result.model).toBe("embed-small");
  });

  it("embed returns one vector for one text", async () => {
    const { embeddings } = resource((_, body) =>
      Response.json(envelope(body.input as string[]))
    );
    const result = await embeddings.embed({
      model: "embed-small",
      input: "hello",
    });
    expect(result.embedding).toEqual([0, 0.5]);
  });
});

describe("embeddings: response checks", () => {
  it("refuses a response with fewer embeddings than inputs", async () => {
    const { embeddings } = resource(() =>
      Response.json({ ...envelope(["a"]), data: [] })
    );
    await expect(
      embeddings.embedMany({ model: "embed-small", input: ["a", "b"] })
    ).rejects.toThrow(EmbeddingResponseError);
  });

  it("refuses duplicate or non-contiguous indices", async () => {
    const { embeddings } = resource(() =>
      Response.json({
        ...envelope(["a", "b"]),
        data: [
          { index: 0, embedding: [1] },
          { index: 0, embedding: [2] },
        ],
      })
    );
    await expect(
      embeddings.embedMany({ model: "embed-small", input: ["a", "b"] })
    ).rejects.toThrow(/indices/);
  });

  it("refuses vectors whose length differs from the requested dimensions", async () => {
    const { embeddings } = resource((_, body) =>
      Response.json(envelope(body.input as string[], () => [1, 2, 3]))
    );
    await expect(
      embeddings.embed({ model: "embed-small", input: "a", dimensions: 2 })
    ).rejects.toThrow(/dimensions/);
  });

  it("refuses vectors of different lengths within one response", async () => {
    const { embeddings } = resource(() =>
      Response.json({
        ...envelope(["a", "b"]),
        data: [
          { index: 0, embedding: [1, 2] },
          { index: 1, embedding: [1] },
        ],
      })
    );
    await expect(
      embeddings.embedMany({ model: "embed-small", input: ["a", "b"] })
    ).rejects.toThrow(/different lengths/);
  });
});

describe("embeddings: local validation", () => {
  /** Runs `create` and reports the error it threw and whether anything was sent. */
  async function attempt(request: EmbeddingCreateRequest) {
    const { embeddings, seen } = resource(() => Response.json({}));
    const error = await embeddings.create(request).catch((e: unknown) => e);
    return { error, sent: seen.calls };
  }

  const pathsOf = (error: unknown) =>
    (error as EmbeddingRequestError).issues.map((issue) => issue.path);

  it("refuses an empty model before the network", async () => {
    const { error, sent } = await attempt({ model: " ", input: "a" });
    expect(error).toBeInstanceOf(EmbeddingRequestError);
    expect(pathsOf(error)).toEqual(["model"]);
    expect(sent).toBe(0);
  });

  it("refuses an empty batch", async () => {
    const { error, sent } = await attempt({ model: "m", input: [] });
    expect(pathsOf(error)).toEqual(["input"]);
    expect(sent).toBe(0);
  });

  it("names the offending element of a batch", async () => {
    const { error } = await attempt({ model: "m", input: ["ok", ""] });
    expect(pathsOf(error)).toEqual(["input[1]"]);
  });

  it("refuses an empty user identifier", async () => {
    const { error, sent } = await attempt({
      model: "m",
      input: "a",
      user: "",
    });
    expect(pathsOf(error)).toEqual(["user"]);
    expect(sent).toBe(0);
  });

  it("refuses NUL characters", async () => {
    const { error } = await attempt({ model: "m", input: "a\0b" });
    expect(pathsOf(error)).toEqual(["input"]);
  });

  it("refuses non-positive dimensions", async () => {
    const { error } = await attempt({ model: "m", input: "a", dimensions: 0 });
    expect(pathsOf(error)).toEqual(["dimensions"]);
  });

  it("refuses fractional dimensions", async () => {
    const { error } = await attempt({
      model: "m",
      input: "a",
      dimensions: 1.5,
    });
    expect(pathsOf(error)).toEqual(["dimensions"]);
  });
});

describe("embeddings: errors", () => {
  it("passes gateway errors through as FrontalError", async () => {
    const { embeddings } = resource(
      () =>
        Response.json(
          {
            error: {
              message: "no",
              type: "x",
              param: null,
              code: "model_not_allowed",
            },
          },
          { status: 403 }
        ),
      { maxRetries: 0 }
    );
    await expect(
      embeddings.embed({ model: "embed-small", input: "a" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("embeddings: types", () => {
  it("returns number arrays by default and strings for base64", () => {
    const { embeddings } = resource(() => Response.json({}));
    const floats = embeddings.create({ model: "m", input: "a" });
    const encoded = embeddings.create({
      model: "m",
      input: "a",
      encodingFormat: "base64",
    });
    expectTypeOf(floats).resolves.toEqualTypeOf<EmbeddingResponse<number[]>>();
    expectTypeOf(encoded).resolves.toEqualTypeOf<EmbeddingResponse<string>>();
    void floats.catch(() => undefined);
    void encoded.catch(() => undefined);
  });

  it("types a runtime-chosen format as number[] | string", () => {
    const { embeddings } = resource(() => Response.json({}));
    const request: EmbeddingCreateRequest = {
      model: "m",
      input: "a",
      encodingFormat: Math.random() > 0.5 ? "base64" : "float",
    };
    const response = embeddings.create(request);
    expectTypeOf(response).resolves.toEqualTypeOf<
      EmbeddingResponse<number[] | string>
    >();
    void response.catch(() => undefined);
  });

  it("embed and embedMany have stable result shapes", () => {
    expectTypeOf<Embedding["embedding"]>().toEqualTypeOf<readonly number[]>();
    expectTypeOf<EmbeddingBatch["embeddings"]>().toEqualTypeOf<
      readonly (readonly number[])[]
    >();
  });

  it("rejects an encoding format outside float and base64", () => {
    const { embeddings } = resource(() => Response.json({}));
    // Type-level only: the call is never made.
    const misuse = () =>
      // @ts-expect-error only "float" or "base64" are accepted
      embeddings.create({ model: "m", input: "a", encodingFormat: "int8" });
    expect(typeof misuse).toBe("function");
  });
});

describe("embeddings: encoding", () => {
  it("refuses float arrays when base64 was requested", async () => {
    const { embeddings } = resource((_, body) =>
      Response.json(envelope(body.input as string[]))
    );
    await expect(
      embeddings.create({ model: "m", input: "a", encodingFormat: "base64" })
    ).rejects.toThrow(/base64 was requested/);
  });

  it("refuses base64 strings when a float array was requested", async () => {
    const { embeddings } = resource((_, body) =>
      Response.json(envelope(body.input as string[], () => "AACAPwAAAEA="))
    );
    await expect(embeddings.embed({ model: "m", input: "a" })).rejects.toThrow(
      /float array was requested/
    );
  });

  it("decodes base64 vectors to the bytes the server sent", async () => {
    // Two little-endian float32 values: 1.0 and 2.0.
    const encoded = "AACAPwAAAEA=";
    const { embeddings } = resource(() =>
      Response.json({
        model: "m",
        data: [{ index: 0, embedding: encoded }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      })
    );
    const response = await embeddings.create({
      model: "m",
      input: "a",
      encodingFormat: "base64",
      dimensions: 2,
    });
    expect(response.data[0]?.embedding).toBe(encoded);
  });

  it("refuses base64 whose decoded length differs from dimensions", async () => {
    const { embeddings } = resource(() =>
      Response.json({
        model: "m",
        data: [{ index: 0, embedding: "AACAPwAAAEA=" }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      })
    );
    await expect(
      embeddings.create({
        model: "m",
        input: "a",
        encodingFormat: "base64",
        dimensions: 3,
      })
    ).rejects.toThrow(/expected 3/);
  });

  it("refuses base64 that is not valid base64", async () => {
    const { embeddings } = resource(() =>
      Response.json({
        model: "m",
        data: [{ index: 0, embedding: "not base64!!" }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      })
    );
    await expect(
      embeddings.create({ model: "m", input: "a", encodingFormat: "base64" })
    ).rejects.toThrow(EmbeddingResponseError);
  });
});
