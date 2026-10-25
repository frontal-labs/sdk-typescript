/**
 * generateText and streamText need a prompt or messages. With neither, they
 * must fail locally instead of sending an empty conversation.
 */

import { HttpClient } from "@frontal-labs/core";
import { describe, expect, it } from "vitest";
import { AISdk } from "../src/sdk";

function sdkWithCounter() {
  let calls = 0;
  const http = new HttpClient({
    apiKey: "frt_test1234567890",
    baseUrl: "https://api.test/v1",
    timeout: 1000,
    maxRetries: 0,
    retryDelay: 0,
    headers: {},
    environment: "test",
    debug: false,
    fetch: async () => {
      calls++;
      return Response.json({});
    },
  });
  return { ai: new AISdk(http), calls: () => calls };
}

describe("generateText input", () => {
  it("rejects a call with neither prompt nor messages, before any request", async () => {
    const { ai, calls } = sdkWithCounter();
    await expect(
      ai.generateText({ model: "gpt-4o-mini" } as never)
    ).rejects.toThrow(/prompt or messages/);
    expect(calls()).toBe(0);
  });

  it("rejects streamText with neither prompt nor messages, synchronously", () => {
    const { ai, calls } = sdkWithCounter();
    expect(() => ai.streamText({ model: "gpt-4o-mini" } as never)).toThrow(
      /prompt or messages/
    );
    expect(calls()).toBe(0);
  });
});
