import { readFileSync } from "node:fs";
import { createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it, vi } from "vitest";
import { VERSION } from "../src/constants";
import { BlobSdk } from "../src/sdk";

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("BlobSdk.upload() payload", () => {
  it("sends the bytes of a ReadableStream, not a stringified stream", async () => {
    const { http } = createTestHttpClient([]);
    const post = vi
      .spyOn(http, "postFormData")
      .mockResolvedValue(undefined as never);
    const service = new BlobSdk(http);

    await service.upload({
      bucket: "my-bucket",
      key: "docs/stream.txt",
      data: streamOf("streamed content"),
      contentType: "text/plain",
    });

    const form = post.mock.calls[0]?.[1] as FormData;
    const file = form.get("file") as Blob;
    expect(await file.text()).toBe("streamed content");
    expect(file.type).toBe("text/plain");
  });

  it("sends the bytes of a Uint8Array", async () => {
    const { http } = createTestHttpClient([]);
    const post = vi
      .spyOn(http, "postFormData")
      .mockResolvedValue(undefined as never);
    const service = new BlobSdk(http);

    await service.upload({
      bucket: "my-bucket",
      key: "bytes.bin",
      data: new TextEncoder().encode("raw bytes"),
    });

    const file = (post.mock.calls[0]?.[1] as FormData).get("file") as Blob;
    expect(await file.text()).toBe("raw bytes");
  });
});

describe("VERSION", () => {
  it("matches the package version", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });
});
