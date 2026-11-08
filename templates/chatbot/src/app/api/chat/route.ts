import { FrontalError, isFrontalError } from "@frontal-labs/error";
import { errorResponse } from "@frontal-labs/error/server";
import { Frontal, toUIMessageStreamResponse } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

export const runtime = "nodejs";

/**
 * POST /api/chat — body: `{ messages: [{ role, content }] }`.
 * Streams the reply using the UI message stream protocol that `useChat`
 * understands. Errors are streamed as frames so the UI can offer a retry.
 */
const SYSTEM_PROMPT = "You are a concise, helpful assistant.";

/**
 * Maps any failure to a response that is safe for the browser. Upstream codes
 * and messages are never forwarded: only the status and an approved message.
 */
function toClientError(err: unknown): Response {
  const status = isFrontalError(err) ? (err.statusCode ?? 500) : 500;
  const wrapped = new FrontalError("Upstream Frontal call failed", {
    cause: err,
    scope: "app",
    code: status === 429 ? "rate_limited" : "upstream_failed",
    statusCode: status,
    public: {
      message:
        status === 429
          ? "Too many requests. Try again shortly."
          : "We could not complete the request.",
    },
  });
  const result = errorResponse(wrapped);
  return new Response(result.body, result);
}

function invalidRequest(): Response {
  const wrapped = new FrontalError("Request body is not a valid chat payload", {
    scope: "app",
    code: "invalid_request",
    statusCode: 400,
    public: { message: "Send a JSON body with a messages array." },
  });
  const result = errorResponse(wrapped);
  return new Response(result.body, result);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidRequest();
  }
  const messages =
    typeof body === "object" && body !== null && "messages" in body
      ? (body as { messages: unknown }).messages
      : undefined;
  if (!Array.isArray(messages)) return invalidRequest();

  // The browser is untrusted: only accept user/assistant turns so a client
  // cannot inject or override the system prompt.
  const history = messages
    .filter(
      (m): m is { role: string; content: unknown } =>
        typeof m === "object" &&
        m !== null &&
        ((m as { role?: unknown }).role === "user" ||
          (m as { role?: unknown }).role === "assistant")
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content),
    }));

  try {
    return toUIMessageStreamResponse(
      f.ai.streamText({
        model: process.env.FRONTAL_MODEL ?? "claude-sonnet-5",
        prompt: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        streamRetries: 1,
      })
    );
  } catch (err) {
    return toClientError(err);
  }
}
