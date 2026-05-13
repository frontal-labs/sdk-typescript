import { createTestHttpClient, type MockRoute } from "@frontal/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlobService } from "../src/client";
import { Storage } from "../src/compat";
import { signedUrlOptionsSchema } from "../src/types";

function createService(routes: MockRoute[] = []) {
	const { http, mock } = createTestHttpClient(routes);
	return { service: new BlobService(http), mock };
}

describe("BlobService", () => {
	describe("upload()", () => {
		it("uploads data to a bucket", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables",
					status: 204,
				},
			]);

			await expect(
				service.upload(
					"my-bucket",
					"docs/file.pdf",
					Buffer.from("content"),
					"application/pdf",
				),
			).resolves.not.toThrow();

			mock.expectCalled("POST", "/v1/storage/lake/lake/tables");
		});

		it("throws on upload failure", async () => {
			const { service } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables",
					status: 500,
					body: {
						code: "SERVER_ERROR",
						message: "Upload failed",
						requestId: "req_1",
					},
				},
			]);

			await expect(
				service.upload("my-bucket", "file.txt", Buffer.from("data")),
			).rejects.toThrow();
		});
	});

	describe("download()", () => {
			it("downloads data as a blob", async () => {
				// getRaw returns raw Response — we need a custom mock fetch for this
				const { http } = createTestHttpClient([]);
				// Override getRaw directly for this test
				const mockBlob = new Blob(["file content"], { type: "text/plain" });
				const getRawSpy = vi
					.spyOn(
						http as unknown as {
							getRaw: () => Promise<{
								blob: () => Promise<Blob>;
								body: null;
							}>;
						},
						"getRaw",
					)
					.mockResolvedValue({
						blob: async () => mockBlob,
						body: null,
					});

			const service = new BlobService(http);
			const result = await service.download("my-bucket", "file.txt");

			expect(result).toBeInstanceOf(Blob);
			getRawSpy.mockRestore();
		});

		it("throws on 404", async () => {
			const { service } = createService([]);
			// No route = 404 from mock fetch, getRaw will throw
			await expect(
				service.download("my-bucket", "missing.txt"),
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
					"getRaw",
				).mockResolvedValue({
					body: stream,
				});

			const service = new BlobService(http);
			const result = await service.downloadStream("my-bucket", "file.bin");

			expect(result).toBe(stream);
		});

			it("throws when response has no body", async () => {
				const { http } = createTestHttpClient([]);
				vi.spyOn(
					http as unknown as {
						getRaw: () => Promise<{ body: ReadableStream | null }>;
					},
					"getRaw",
				).mockResolvedValue({
					body: null,
				});

			const service = new BlobService(http);
			await expect(
				service.downloadStream("my-bucket", "file.bin"),
			).rejects.toThrow("Response has no body stream");
		});
	});

	describe("delete()", () => {
		it("deletes an object from a bucket", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables/file.txt/materializations",
					status: 204,
				},
			]);

			await expect(
				service.delete("my-bucket", "file.txt"),
			).resolves.not.toThrow();
			mock.expectCalled(
				"POST",
				"/v1/storage/lake/lake/tables/file.txt/materializations",
			);
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
					method: "GET",
					path: "/v1/storage/lake/lake/tables",
					body: listResponse,
				},
			]);

			const result = await service.list("my-bucket");

			expect(result.objects).toHaveLength(2);
		});

		it("lists objects with prefix", async () => {
			const { service, mock } = createService([
				{
					method: "GET",
					path: "/v1/storage/lake/lake/tables",
					body: { objects: [] },
				},
			]);

			await service.list("my-bucket", "docs/");

			const req = mock.requests[0];
			expect(req.url).toContain("prefix=docs%2F");
		});
	});

	describe("getSignedUrl()", () => {
		it("generates a signed URL for read", async () => {
			const { service } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables/my-bucket/materializations",
					body: "https://signed.example.com/file.txt?token=abc",
				},
			]);

			const result = await service.getSignedUrl("my-bucket", {
				key: "file.txt",
				operation: "read",
				expiresIn: 3600,
			});

			expect(result).toContain("https://signed.example.com");
		});

		it("throws on invalid options (negative expiresIn)", async () => {
			const { service } = createService([]);

				await expect(
					service.getSignedUrl("my-bucket", {
						key: "file.txt",
						operation: "read",
						expiresIn: -100,
					}),
				).rejects.toThrow();
			});
		});

	describe("copyObject()", () => {
		it("copies an object across buckets", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables/file.txt/materializations",
					status: 200,
					body: {},
				},
			]);

			await service.copyObject(
				"source-bucket",
				"file.txt",
				"dest-bucket",
				"copy.txt",
			);

			mock.expectCalledWith(
				"POST",
				"/v1/storage/lake/lake/tables/file.txt/materializations",
				{
					destBucket: "dest-bucket",
					destKey: "copy.txt",
				},
			);
		});
	});

	describe("moveObject()", () => {
		it("moves an object across buckets", async () => {
			const { service, mock } = createService([
				{
					method: "POST",
					path: "/v1/storage/lake/lake/tables/file.txt/materializations",
					status: 200,
					body: {},
				},
			]);

			await service.moveObject(
				"source-bucket",
				"file.txt",
				"dest-bucket",
				"moved.txt",
			);

			mock.expectCalledWith(
				"POST",
				"/v1/storage/lake/lake/tables/file.txt/materializations",
				{
					destBucket: "dest-bucket",
					destKey: "moved.txt",
				},
			);
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
			const { service } = createService([
				{
					method: "GET",
					path: "/v1/storage/lake/lake/tables/file.txt",
					body: metadata,
				},
			]);

			const result = await service.getMetadata("my-bucket", "file.txt");

			expect(result.key).toBe("file.txt");
			expect(result.size).toBe(1024);
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

describe("Storage (deprecated compat)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns APIResponse with error on upload failure", async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
		vi.stubGlobal("fetch", mockFetch);

		const storage = new Storage({
			apiKey: "frt_test-api-key-1234567890",
			baseUrl: "https://api.test.frontal.dev/v1",
		});

		const result = await storage.upload(
			"my-bucket",
			"file.txt",
			Buffer.from("data"),
		);

		expect(result.error).toBeDefined();
		expect(result.error?.name).toBe("upload_error");
	});

	it("returns APIResponse with error on download failure", async () => {
		const mockFetch = vi
			.fn()
			.mockRejectedValue(new Error("Connection refused"));
		vi.stubGlobal("fetch", mockFetch);

		const storage = new Storage({
			apiKey: "frt_test-api-key-1234567890",
			baseUrl: "https://api.test.frontal.dev/v1",
		});

		const result = await storage.download("my-bucket", "file.txt");

		expect(result.data).toBeNull();
		expect(result.error?.name).toBe("download_error");
	});
});
