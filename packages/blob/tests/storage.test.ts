import { createTestHttpClient, type MockRoute } from "@frontal-labs/testing";
import { describe, expect, it, vi } from "vitest";
import { BlobSdk } from "../src/sdk";
import { signedUrlOptionsSchema } from "../src/schemas";

function createService(routes: MockRoute[] = []) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new BlobSdk(http), mock };
}

describe("BlobSdk", () => {
  describe("upload()", () => {
    it("uploads data to an object path", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/blob/object/my-bucket/docs/file.pdf",
          body: { Key: "docs/file.pdf" },
        },
      ]);

      await expect(
        service.upload({
          bucket: "my-bucket",
          key: "docs/file.pdf",
          data: Buffer.from("content"),
          contentType: "application/pdf",
        })
      ).resolves.not.toThrow();

      mock.expectCalled("POST", "/blob/object/my-bucket/docs/file.pdf");
    });

    it("throws on upload failure", async () => {
      const { service } = createService([
        {
          method: "POST",
          path: "/blob/object/my-bucket/file.txt",
          status: 500,
          body: {
            code: "SERVER_ERROR",
            message: "Upload failed",
            requestId: "req_1",
          },
        },
      ]);

      await expect(
        service.upload({
          bucket: "my-bucket",
          key: "file.txt",
          data: Buffer.from("data"),
        })
      ).rejects.toThrow();
    });
  });

  describe("download()", () => {
    it("downloads data as a blob", async () => {
      const { http } = createTestHttpClient([]);
      const mockBlobSdk = new BlobSdk(["file content"], { type: "text/plain" });
      const getRawSpy = vi
        .spyOn(
          http as unknown as {
            getRaw: () => Promise<{
              blob: () => Promise<BlobSdk>;
              body: null;
            }>;
          },
          "getRaw"
        )
        .mockResolvedValue({
          blob: async () => mockBlobSdk,
          body: null,
        });

      const service = new BlobSdk(http);
      const result = await service.download({
        bucket: "my-bucket",
        key: "file.txt",
      });

      expect(result).toBeInstanceOf(BlobSdk);
      expect(getRawSpy).toHaveBeenCalledWith("/blob/object/my-bucket/file.txt");
      getRawSpy.mockRestore();
    });

    it("throws on 404", async () => {
      const { service } = createService([]);
      await expect(
        service.download({ bucket: "my-bucket", key: "missing.txt" })
      ).rejects.toThrow();
    });
  });

  describe("downloadStream()", () => {
    it("downloads data as a readable stream", async () => {
      const { http } = createTestHttpClient([]);
      const stream = new ReadableStream();
      vi.spyOn(
        http as unknown as {
          getRaw: () => Promise<{ body: ReadableStream | null }>;
        },
        "getRaw"
      ).mockResolvedValue({
        body: stream,
      });

      const service = new BlobSdk(http);
      const result = await service.downloadStream({
        bucket: "my-bucket",
        key: "file.bin",
      });

      expect(result).toBe(stream);
    });

    it("throws when response has no body", async () => {
      const { http } = createTestHttpClient([]);
      vi.spyOn(
        http as unknown as {
          getRaw: () => Promise<{ body: ReadableStream | null }>;
        },
        "getRaw"
      ).mockResolvedValue({
        body: null,
      });

      const service = new BlobSdk(http);
      await expect(
        service.downloadStream({ bucket: "my-bucket", key: "file.bin" })
      ).rejects.toThrow("Response has no body stream");
    });
  });

  describe("delete()", () => {
    it("deletes an object from a bucket", async () => {
      const { service, mock } = createService([
        {
          method: "DELETE",
          path: "/blob/object/my-bucket/file.txt",
          status: 200,
          body: {},
        },
      ]);

      await expect(
        service.delete({ bucket: "my-bucket", key: "file.txt" })
      ).resolves.not.toThrow();
      mock.expectCalled("DELETE", "/blob/object/my-bucket/file.txt");
    });
  });

  describe("list()", () => {
    it("lists objects in a bucket", async () => {
      const listResponse = {
        objects: [
          {
            key: "file1.txt",
            size: 100,
            contentType: "text/plain",
            lastModified: "2024-01-01T00:00:00Z",
            etag: '"abc"',
          },
          {
            key: "file2.txt",
            size: 200,
            contentType: "text/plain",
            lastModified: "2024-01-01T00:00:00Z",
            etag: '"def"',
          },
        ],
      };
      const { service } = createService([
        {
          method: "POST",
          path: "/blob/object/list/my-bucket",
          body: listResponse,
        },
      ]);

      const result = await service.list({ bucket: "my-bucket" });

      expect(result.objects).toHaveLength(2);
    });

    it("lists objects with prefix in the request body", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/blob/object/list/my-bucket",
          body: { objects: [] },
        },
      ]);

      await service.list({ bucket: "my-bucket", prefix: "docs/" });

      mock.expectCalledWith("POST", "/blob/object/list/my-bucket", {
        prefix: "docs/",
      });
    });
  });

  describe("getSignedUrl()", () => {
    it("generates a signed URL for an object", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/blob/object/sign/my-bucket/file.txt",
          body: { signedURL: "https://signed.example.com/file.txt?token=abc" },
        },
      ]);

      const result = await service.getSignedUrl({
        bucket: "my-bucket",
        options: {
          key: "file.txt",
          operation: "read",
          expiresIn: 3600,
        },
      });

      expect(result).toContain("https://signed.example.com");
      mock.expectCalled("POST", "/blob/object/sign/my-bucket/file.txt");
    });

    it("throws on invalid options (negative expiresIn)", async () => {
      const { service } = createService([]);

      await expect(
        service.getSignedUrl({
          bucket: "my-bucket",
          options: {
            key: "file.txt",
            operation: "read",
            expiresIn: -100,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("copyObject()", () => {
    it("copies an object across buckets", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/blob/object/copy",
          status: 200,
          body: {},
        },
      ]);

      await service.copyObject({
        sourceBucket: "source-bucket",
        sourceKey: "file.txt",
        destBucket: "dest-bucket",
        destKey: "copy.txt",
      });

      mock.expectCalledWith("POST", "/blob/object/copy", {
        bucketId: "source-bucket",
        sourceKey: "file.txt",
        destinationBucket: "dest-bucket",
        destinationKey: "copy.txt",
      });
    });
  });

  describe("moveObject()", () => {
    it("moves an object across buckets", async () => {
      const { service, mock } = createService([
        {
          method: "POST",
          path: "/blob/object/move",
          status: 200,
          body: {},
        },
      ]);

      await service.moveObject({
        sourceBucket: "source-bucket",
        sourceKey: "file.txt",
        destBucket: "dest-bucket",
        destKey: "moved.txt",
      });

      mock.expectCalledWith("POST", "/blob/object/move", {
        bucketId: "source-bucket",
        sourceKey: "file.txt",
        destinationBucket: "dest-bucket",
        destinationKey: "moved.txt",
      });
    });
  });

  describe("getMetadata()", () => {
    it("retrieves object metadata", async () => {
      const metadata = {
        key: "file.txt",
        size: 1024,
        contentType: "text/plain",
        lastModified: "2024-01-01T00:00:00Z",
        etag: '"abc123"',
      };
      const { service, mock } = createService([
        {
          method: "GET",
          path: "/blob/object/info/my-bucket/file.txt",
          body: metadata,
        },
      ]);

      const result = await service.getMetadata({
        bucket: "my-bucket",
        key: "file.txt",
      });

      expect(result.key).toBe("file.txt");
      expect(result.size).toBe(1024);
      mock.expectCalled("GET", "/blob/object/info/my-bucket/file.txt");
    });
  });
});

describe("Schema validation", () => {
  it("rejects invalid operation type", () => {
    expect(() => {
      signedUrlOptionsSchema.parse({
        key: "test.txt",
        operation: "invalid",
        expiresIn: 3600,
      });
    }).toThrow();
  });

  it("accepts empty key (schema allows it)", () => {
    expect(() => {
      signedUrlOptionsSchema.parse({
        key: "",
        operation: "read",
        expiresIn: 3600,
      });
    }).not.toThrow();
  });

  it("accepts valid options", () => {
    expect(() => {
      signedUrlOptionsSchema.parse({
        key: "test.txt",
        operation: "read",
        expiresIn: 3600,
      });
    }).not.toThrow();
  });
});
