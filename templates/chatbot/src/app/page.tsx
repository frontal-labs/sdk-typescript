"use client";
import { useChat } from "@frontal-labs/react";
import { useState } from "react";

export default function Chat() {
  const { messages, send, status, error, retry, stop } = useChat({ api: "/api/chat" });
  const [input, setInput] = useState("");

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui" }}>
      {messages.map((m) => (
        <div key={m.id} style={{ margin: "0.5rem 0" }}>
          <b>{m.role}:</b>{" "}
          {m.parts.map((p, i) =>
            p.type === "text" ? (
              <span key={i}>{p.text}</span>
            ) : p.type === "tool-call" ? (
              <code key={i}>
                {p.toolName}({JSON.stringify(p.input)})
              </code>
            ) : (
              <em key={i} style={{ color: "crimson" }}>
                {p.error.message}
                {p.error.retryable ? " (retryable)" : ""}
              </em>
            )
          )}
        </div>
      ))}
      {error?.retryable && (
        <button type="button" onClick={() => retry()}>
          Retry
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          void send(input);
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          style={{ width: "80%" }}
        />
        <button disabled={status === "streaming"}>Send</button>
        {status === "streaming" && (
          <button type="button" onClick={stop}>
            Stop
          </button>
        )}
      </form>
    </main>
  );
}
