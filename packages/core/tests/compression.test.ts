/**
 * Tests for opt-in zstd request compression.
 */

import { zstdDecompressSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { HttpClient } from "../src/http";

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

interface Sent {
  headers: Headers;
  body: unknown;
}

function capture(
  compression?: "zstd" | false,
  respond?: (n: number) => Response
) {
  const sent: Sent[] = [];
  const http = new HttpClient({
    ...base,
    compression: compression ?? false,
    fetch: async (_input, init) => {
      const headers = new Headers(init?.headers);
      const raw = init?.body;
      let body: unknown = raw;
      if (raw instanceof Uint8Array) {
        body = JSON.parse(
          Buffer.from(zstdDecompressSync(raw)).toString("utf8")
        );
      } else if (typeof raw === "string") {
        body = JSON.parse(raw);
      }
      sent.push({ headers, body });
      return respond ? respond(sent.length) : Response.json({ ok: true });
    },
  });
  return { http, sent };
}

const large = {
  text: "x".repeat(4096),
  items: Array.from({ length: 50 }, (_, i) => i),
};

describe("zstd request compression", () => {
  it("compresses a body of 1 KiB or more and labels it", async () => {
    const { http, sent } = capture("zstd");
    await http.post("/x", large);
    expect(sent[0]?.headers.get("Content-Encoding")).toBe("zstd");
    expect(sent[0]?.body).toEqual({ text: large.text, items: large.items });
  });

  it("keeps the auth and request-id headers alongside the encoding", async () => {
    const { http, sent } = capture("zstd");
    await http.post("/x", large);
    expect(sent[0]?.headers.get("Authorization")).toBe(`Bearer ${base.apiKey}`);
    expect(sent[0]?.headers.get("X-Request-Id")).toBeTruthy();
    expect(sent[0]?.headers.get("Content-Type")).toBe("application/json");
  });

  it("sends a small body uncompressed even when enabled", async () => {
    const { http, sent } = capture("zstd");
    await http.post("/x", { a: 1 });
    expect(sent[0]?.headers.get("Content-Encoding")).toBeNull();
    expect(sent[0]?.body).toEqual({ a: 1 });
  });

  it("never compresses by default", async () => {
    const { http, sent } = capture();
    await http.post("/x", large);
    expect(sent[0]?.headers.get("Content-Encoding")).toBeNull();
  });

  it("re-sends the compressed body on a retried POST marked idempotent", async () => {
    const { http, sent } = capture("zstd", (n) =>
      n === 1
        ? new Response("{}", { status: 503 })
        : Response.json({ ok: true })
    );
    await http.post("/x", large, undefined, {
      retry: { maxRetries: 1, idempotent: true },
    });
    expect(sent).toHaveLength(2);
    expect(sent.map((s) => s.headers.get("Content-Encoding"))).toEqual([
      "zstd",
      "zstd",
    ]);
    expect(sent[1]?.body).toEqual(sent[0]?.body);
  });

  describe("runtime without zstd", () => {
    const original = (globalThis as { process?: unknown }).process;
    afterEach(() => {
      (globalThis as { process?: unknown }).process = original;
    });

    it("fails at construction with a message that names the fallback", () => {
      (globalThis as { process?: unknown }).process = {
        getBuiltinModule: () => ({}),
      };
      expect(
        () =>
          new HttpClient({
            ...base,
            compression: "zstd",
            fetch: async () => Response.json({}),
          })
      ).toThrow(/compression: false/);
    });
  });
});
