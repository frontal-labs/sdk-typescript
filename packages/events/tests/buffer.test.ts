import { describe, expect, it, vi } from "vitest";
import { EventBuffer } from "../src/buffer";
import type { PublishEvent } from "../src/schemas";

describe("EventBuffer", () => {
  it("flushes events on interval", async () => {
    const publishFn = vi
      .fn()
      .mockResolvedValue({ published: 1, event_ids: [] });
    const buffer = new EventBuffer(publishFn, {
      flushIntervalMs: 10,
      maxBatchSize: 100,
    });

    buffer.add("test.topic", {
      source: "test",
      type: "test.event",
      data: { hello: "world" },
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(publishFn).toHaveBeenCalled();
    buffer.destroy();
  });

  it("flushes when batch size reached", async () => {
    const publishFn = vi
      .fn()
      .mockResolvedValue({ published: 2, event_ids: [] });
    const buffer = new EventBuffer(publishFn, {
      flushIntervalMs: 10_000,
      maxBatchSize: 2,
    });

    const event: PublishEvent = { source: "t", type: "e", data: {} };
    buffer.add("t1", event);
    buffer.add("t1", event);

    await new Promise((r) => setTimeout(r, 20));

    expect(publishFn).toHaveBeenCalled();
    buffer.destroy();
  });

  it("groups events by topic on flush", async () => {
    const publishFn = vi
      .fn()
      .mockResolvedValue({ published: 1, event_ids: [] });
    const buffer = new EventBuffer(publishFn, {
      flushIntervalMs: 10_000,
      maxBatchSize: 10,
    });

    buffer.add("topic-a", { source: "t", type: "e", data: {} });
    buffer.add("topic-b", { source: "t", type: "e", data: {} });

    await buffer.flush();

    expect(publishFn).toHaveBeenCalledTimes(2);
    expect(buffer.pending).toBe(0);
    buffer.destroy();
  });

  it("tracks pending count", () => {
    const buffer = new EventBuffer(vi.fn().mockResolvedValue({}));
    buffer.add("t", { source: "s", type: "e", data: {} });
    expect(buffer.pending).toBe(1);
    buffer.destroy();
  });
});
