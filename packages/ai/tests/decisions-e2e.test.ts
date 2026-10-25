/**
 * End-to-end: the public `createAIClient` talks over real HTTP to a local
 * server that implements `contracts/openapi/ai.openapi.json`. Nothing is
 * stubbed below the SDK: transport, JSON, compression, retries, and errors all
 * run for real. The server validates each request against the same Zod wire
 * schemas the contract is generated from.
 */

import { createServer, type IncomingMessage, type Server } from "node:http";
import { zstdDecompressSync } from "node:zlib";
import { PaymentRequiredError } from "@frontal-labs/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { decisionRequestWireSchema } from "../src/schemas";
import {
  choice,
  createAIClient,
  DecisionRequestError,
  evaluateDecision,
  noul,
  score,
} from "../src/index";

const API_KEY = "frt_e2e1234567890";
const MODEL = "frontal-labs/decision-4B";

let server: Server;
let baseUrl: string;
/** Requests that reached the server, after decompression. */
const received: Array<{ headers: IncomingMessage["headers"]; body: unknown }> =
  [];
let flakyRequests = 0;

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function errorBody(code: string, message: string) {
  return { code, message, request_id: "req_e2e_error" };
}

beforeAll(async () => {
  // The shared setup stubs global fetch for unit tests. This suite exercises the
  // real transport, so restore the runtime fetch first.
  vi.unstubAllGlobals();
  server = createServer(async (req, res) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_KEY}`) {
      return send(res, 401, errorBody("UNAUTHORIZED", "Invalid API key"));
    }

    if (req.method === "GET" && req.url === "/ai/decisions/models") {
      return send(res, 200, {
        models: [
          {
            name: MODEL,
            description: "Structured decisions",
            release_date: "2026-10-01",
          },
        ],
      });
    }

    if (req.method !== "POST" || req.url !== "/ai/decisions") {
      return send(res, 404, errorBody("NOT_FOUND", "No such route"));
    }

    let raw = await readBody(req);
    if (req.headers["content-encoding"] === "zstd") {
      raw = Buffer.from(zstdDecompressSync(raw));
    }
    const body = JSON.parse(raw.toString("utf8")) as unknown;
    received.push({ headers: req.headers, body });

    const parsed = decisionRequestWireSchema.safeParse(body);
    if (!parsed.success) {
      return send(res, 400, errorBody("VALIDATION_ERROR", "Invalid request"));
    }
    const request = parsed.data;

    if (request.model === "frontal-labs/unknown") {
      return send(res, 422, errorBody("UNKNOWN_MODEL", "No such model"));
    }
    if (request.model === "frontal-labs/no-balance") {
      return send(res, 402, errorBody("PAYMENT_REQUIRED", "Top up"));
    }
    if (request.model === "frontal-labs/flaky" && flakyRequests++ < 1) {
      return send(res, 503, errorBody("UNAVAILABLE", "Try again"));
    }

    // Answer deterministically from the question and the state.
    const stateLength = request.state.length;
    const answers = request.questions.map((question) => {
      if (question.type === "noul") {
        return {
          name: question.name,
          type: "noul",
          noul: stateLength > 20 ? 0.9 : 0.1,
        };
      }
      if (question.type === "choice") {
        const labels = (question.criteria ?? []) as Array<{ label: string }>;
        return {
          name: question.name,
          type: "choice",
          choice: labels[0]?.label ?? "",
          probabilities: labels.map((l, i) => ({
            label: l.label,
            probability: i === 0 ? 0.8 : 0.2,
          })),
          confidence: 0.8,
        };
      }
      return {
        name: question.name,
        type: "score",
        score: 1,
        level: (question.criteria as string[])[1],
        probabilities: (question.criteria as string[]).map((_, i) =>
          i === 1 ? 0.7 : 0.15
        ),
        confidence: 0.7,
      };
    });

    return send(res, 200, {
      model: request.model,
      request_id: `req_e2e_${received.length}`,
      usage: { input_tokens: 42, output_tokens: 3, cached_tokens: 0 },
      answers,
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address !== "object" || address === null)
    throw new Error("no address");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const client = () =>
  createAIClient({ apiKey: API_KEY, baseUrl, maxRetries: 2 });

const questions = {
  billing: noul("Is this about billing?"),
  topic: choice("What is it?", { api_error: null, billingIssue: null }),
  severity: score("How severe?", ["low", "medium", "high"]),
};

describe("decisions end-to-end over HTTP", () => {
  it("answers typed questions and keeps user labels intact", async () => {
    const result = await client().decisions.decide({
      model: MODEL,
      state: { ticket: "I was charged twice, please fix this ASAP." },
      questions,
    });

    expect(result.model).toBe(MODEL);
    expect(result.requestId).toMatch(/^req_e2e_/);
    expect(result.usage).toEqual({
      inputTokens: 42,
      outputTokens: 3,
      cachedTokens: 0,
    });
    expect(result.answers.billing.noul).toBe(0.9);
    expect(result.answers.topic.choice).toBe("api_error");
    expect(result.answers.topic.probabilities).toEqual({
      api_error: 0.8,
      billingIssue: 0.2,
    });
    expect(result.answers.severity.level).toBe("medium");
  });

  it("lists decision models in camelCase", async () => {
    const models = await client().decisions.models();
    expect(models).toEqual([
      {
        name: MODEL,
        description: "Structured decisions",
        releaseDate: "2026-10-01",
      },
    ]);
  });

  it("sends state as text and names as values, with the key transform intact", async () => {
    received.length = 0;
    await client().decisions.decide({
      model: MODEL,
      state: { order_id: 7 },
      questions: { billing_issue: noul("Is it billing?") },
    });
    const body = received.at(-1)?.body as {
      state: string;
      questions: Array<{ name: string }>;
    };
    expect(body.state).toBe('{"order_id":7}');
    expect(body.questions[0]?.name).toBe("billing_issue");
  });

  it("rejects invalid input before any request reaches the server", async () => {
    received.length = 0;
    await expect(
      client().decisions.decide({
        model: MODEL,
        state: { value: Number.NaN },
        questions: { ok: noul("Is it?") },
      })
    ).rejects.toBeInstanceOf(DecisionRequestError);
    expect(received).toHaveLength(0);
  });

  it("compresses a large body with zstd when enabled, and the server reads it", async () => {
    received.length = 0;
    const ai = createAIClient({
      apiKey: API_KEY,
      baseUrl,
      compression: "zstd",
    });
    const big = { note: "x".repeat(8192) };
    const result = await ai.decisions.decide({
      model: MODEL,
      state: big,
      questions: { billing: noul("Is it billing?") },
    });
    expect(result.answers.billing.noul).toBe(0.9);
    expect(received.at(-1)?.headers["content-encoding"]).toBe("zstd");
  });

  it("retries a transient 503 because decisions are idempotent", async () => {
    flakyRequests = 0;
    const result = await client().decisions.decide({
      model: "frontal-labs/flaky",
      state: "text",
      questions: { billing: noul("Is it?") },
    });
    expect(result.answers.billing.noul).toBe(0.1);
    // Two requests reached the server: the 503 and the retry that succeeded.
    expect(flakyRequests).toBe(2);
  }, 10_000);

  it("maps a 402 to PaymentRequiredError", async () => {
    await expect(
      client().decisions.decide({
        model: "frontal-labs/no-balance",
        state: "text",
        questions: { billing: noul("Is it?") },
      })
    ).rejects.toBeInstanceOf(PaymentRequiredError);
  });

  it("maps a 422 to a typed API error carrying its status", async () => {
    await expect(
      client().decisions.decide({
        model: "frontal-labs/unknown",
        state: "text",
        questions: { billing: noul("Is it?") },
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects a 401 from a wrong key", async () => {
    const wrong = createAIClient({ apiKey: "frt_wrongkey123", baseUrl });
    await expect(
      wrong.decisions.decide({
        model: MODEL,
        state: "text",
        questions: { billing: noul("Is it?") },
      })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("cancels a call through its signal", async () => {
    const controller = new AbortController();
    controller.abort(new Error("caller cancelled"));
    await expect(
      client().decisions.decide(
        { model: MODEL, state: "text", questions: { billing: noul("Is it?") } },
        { signal: controller.signal }
      )
    ).rejects.toThrow("caller cancelled");
  });

  it("audits a decision and evaluates a policy over it", async () => {
    const records: unknown[] = [];
    const result = await client().decisions.decide(
      {
        model: MODEL,
        state: "I was charged twice, please fix this ASAP.",
        questions,
      },
      { onDecision: (record) => void records.push(record) }
    );
    expect(records).toHaveLength(1);
    expect((records[0] as { requestId: string }).requestId).toBe(
      result.requestId
    );

    const verdict = evaluateDecision(result, [
      {
        id: "billing-needs-review",
        question: "billing",
        action: "review",
        reason: "Billing changes are reviewed",
        matches: (answer) => answer.noul > 0.8,
      },
    ]);
    expect(verdict.action).toBe("review");
  });
});
