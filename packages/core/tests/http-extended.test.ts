import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../src/http";
import { cleanupMocks, createMockConfig, createMockSSEStream } from "./setup";

describe("HttpClient extended methods", () => {
  let http: HttpClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    http = new HttpClient(createMockConfig({ fetch: mockFetch }));
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe("postStream()", () => {
    it("sends POST and parses SSE events", async () => {
      const stream = createMockSSEStream([
        { type: "delta", data: { text: "Hello" } },
        { type: "delta", data: { text: " world" } },
      ]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const events: unknown[] = [];
      for await (const event of http.postStream("/ai/chat", {
        model: "gpt-4",
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        type: "delta",
        data: { text: "Hello" },
      });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/ai/chat");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ model: "gpt-4" });
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          code: "SERVER_ERROR",
          message: "Internal error",
          requestId: "req_1",
        }),
      });

      const iter = http.postStream("/ai/chat");
      await expect(iter.next()).rejects.toThrow();
    });
  });

  describe("postRaw()", () => {
    it("sends POST and returns raw Response", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const res = await http.postRaw("/ai/audio/speech", { text: "Hello" });

      expect(res).toBe(mockResponse);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/ai/audio/speech");
      expect(init.method).toBe("POST");
    });

    it("passes extra headers", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await http.postRaw("/test", undefined, { "X-Custom": "value" });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init.headers;
      expect(headers.get("X-Custom")).toBe("value");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          code: "NOT_FOUND",
          message: "Not found",
          requestId: "req_1",
        }),
      });

      await expect(http.postRaw("/missing")).rejects.toThrow();
    });
  });

  describe("postFormData()", () => {
    it("sends FormData without Content-Type header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: "transcribed text" }),
      });

      const formData = new FormData();
      formData.append("file", new Blob(["audio"]), "audio.mp3");
      formData.append("model", "whisper-1");

      const result = await http.postFormData<{ text: string }>(
        "/ai/transcriptions",
        formData
      );

      expect(result).toEqual({ text: "transcribed text" });
      const [, init] = mockFetch.mock.calls[0];
      // Content-Type should be deleted so runtime sets multipart boundary
      expect(init.headers.has("Content-Type")).toBe(false);
      expect(init.body).toBe(formData);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: "INVALID_INPUT",
          message: "Bad request",
          requestId: "req_1",
        }),
      });

      const formData = new FormData();
      await expect(http.postFormData("/test", formData)).rejects.toThrow();
    });
  });

  describe("getRaw()", () => {
    it("sends GET and returns raw Response", async () => {
      const mockBlob = new Blob(["file content"], { type: "text/plain" });
      const mockResponse = {
        ok: true,
        status: 200,
        blob: async () => mockBlob,
        body: new ReadableStream(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const res = await http.getRaw("/storage/my-bucket/file.txt");

      expect(res).toBe(mockResponse);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/storage/my-bucket/file.txt");
      expect(init.method).toBe("GET");
    });

    it("passes query parameters", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await http.getRaw("/files", { prefix: "docs/" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("prefix=docs%2F");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          code: "NOT_FOUND",
          message: "Object not found",
          requestId: "req_1",
        }),
      });

      await expect(http.getRaw("/missing")).rejects.toThrow();
    });
  });
});
