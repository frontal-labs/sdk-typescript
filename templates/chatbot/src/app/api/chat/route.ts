import { Frontal, toUIMessageStreamResponse } from "@frontal-labs/sdk";

const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

export const runtime = "nodejs";

/**
 * POST /api/chat — body: `{ messages: [{ role, content }] }`.
 * Streams the reply using the UI message stream protocol that `useChat`
 * understands. Errors are streamed as frames so the UI can offer a retry.
 */
const SYSTEM_PROMPT = "You are a concise, helpful assistant.";

export async function POST(req: Request): Promise<Response> {
  const { messages } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
  };
  // The browser is untrusted: only accept user/assistant turns so a client
  // cannot inject or override the system prompt.
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));

  return toUIMessageStreamResponse(
    f.ai.streamText({
      model: process.env.FRONTAL_MODEL ?? "claude-sonnet-5",
      prompt: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      streamRetries: 1,
    })
  );
}
