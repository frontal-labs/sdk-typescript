/**
 * Comprehensive tests for FrontalClient
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { FrontalClient } from "../src/client";
import { HttpClient } from "../src/http";
import { cleanupMocks, createMockConfig, createMockFetch } from "./setup";

describe("FrontalClient", () => {
	let client: FrontalClient;
	let mockFetch: ReturnType<typeof createMockFetch>;

	beforeEach(() => {
		mockFetch = createMockFetch();
		global.fetch = mockFetch;
		client = new FrontalClient(createMockConfig());
	});

	afterEach(() => {
		cleanupMocks();
	});

	describe("Constructor", () => {
		it("should create a client with valid configuration", () => {
			expect(client).toBeInstanceOf(FrontalClient);
			expect(client._http).toBeInstanceOf(HttpClient);
		});

		it("should store the HTTP client as readonly", () => {
			expect(() => {
				(client as any)._http = null;
			}).toThrow();
		});
	});

	describe("GET requests", () => {
		it("should make a successful GET request without schema", async () => {
			const responseData = { id: "123", name: "Test User" };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.get("/users/123");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/users/123",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer frt_test1234567890abcdef",
						"Content-Type": "application/json",
						"User-Agent": expect.stringContaining("@frontal/core"),
					}),
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should make a successful GET request with schema validation", async () => {
			const responseData = {
				id: "123",
				name: "Test User",
				email: "test@example.com",
			};
			const userSchema = z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.get("/users/123", userSchema);

			expect(result).toEqual(responseData);
		});

		it("should handle schema validation errors", async () => {
			const responseData = { id: "123", name: "Test User" }; // Missing email
			const userSchema = z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			await expect(client.get("/users/123", userSchema)).rejects.toThrow();
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			await expect(client.get("/users/123")).rejects.toThrow("Network error");
		});
	});

	describe("POST requests", () => {
		it("should make a successful POST request without schema", async () => {
			const requestData = { name: "John Doe", email: "john@example.com" };
			const responseData = { id: "456", ...requestData };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 201,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.post("/users", requestData);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/users",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer frt_test1234567890abcdef",
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(requestData),
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should make a successful POST request with schema validation", async () => {
			const requestData = { name: "John Doe", email: "john@example.com" };
			const responseData = {
				id: "456",
				...requestData,
				createdAt: "2023-01-01T00:00:00Z",
			};
			const userSchema = z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email(),
				createdAt: z.string(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 201,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.post("/users", requestData, userSchema);

			expect(result).toEqual(responseData);
		});

		it("should handle POST request with empty body", async () => {
			const responseData = { status: "ok" };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.post("/ping");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/ping",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({}),
				}),
			);
			expect(result).toEqual(responseData);
		});
	});

	describe("PUT requests", () => {
		it("should make a successful PUT request", async () => {
			const requestData = { name: "Jane Doe" };
			const responseData = { id: "123", ...requestData };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.put("/users/123", requestData);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/users/123",
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(requestData),
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should handle PUT request with schema validation", async () => {
			const requestData = { name: "Jane Doe" };
			const responseData = {
				id: "123",
				...requestData,
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const userSchema = z.object({
				id: z.string(),
				name: z.string(),
				updatedAt: z.string(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.put("/users/123", requestData, userSchema);

			expect(result).toEqual(responseData);
		});
	});

	describe("PATCH requests", () => {
		it("should make a successful PATCH request", async () => {
			const requestData = { name: "Jane Doe" };
			const responseData = { id: "123", ...requestData };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.patch("/users/123", requestData);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/users/123",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify(requestData),
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should handle PATCH request with schema validation", async () => {
			const requestData = { name: "Jane Doe" };
			const responseData = {
				id: "123",
				...requestData,
				updatedAt: "2023-01-01T00:00:00Z",
			};
			const userSchema = z.object({
				id: z.string(),
				name: z.string(),
				updatedAt: z.string(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.patch("/users/123", requestData, userSchema);

			expect(result).toEqual(responseData);
		});
	});

	describe("DELETE requests", () => {
		it("should make a successful DELETE request without response", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 204,
				headers: new Headers(),
				json: async () => null,
			});

			await expect(client.delete("/users/123")).resolves.toBeUndefined();

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/users/123",
				expect.objectContaining({
					method: "DELETE",
				}),
			);
		});

		it("should handle DELETE request with response data", async () => {
			const responseData = { message: "User deleted successfully" };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.delete("/users/123");

			expect(result).toEqual(responseData);
		});

		it("should handle DELETE request with schema validation", async () => {
			const responseData = {
				message: "User deleted successfully",
				deletedAt: "2023-01-01T00:00:00Z",
			};
			const deleteSchema = z.object({
				message: z.string(),
				deletedAt: z.string(),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.delete("/users/123", deleteSchema);

			expect(result).toEqual(responseData);
		});
	});

	describe("SSE Streaming", () => {
		it("should handle Server-Sent Events streaming", async () => {
			const events = [
				{ type: "user_created", data: { id: "1", name: "John" } },
				{ type: "user_updated", data: { id: "1", name: "Jane" } },
			];

			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				start(controller) {
					events.forEach((event) => {
						const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
						controller.enqueue(encoder.encode(data));
					});
					controller.close();
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "text/event-stream" }),
				body: stream,
			});

			const receivedEvents = [];
			for await (const event of client.stream("/events")) {
				receivedEvents.push(event);
			}

			expect(receivedEvents).toHaveLength(2);
			expect(receivedEvents[0]).toEqual(events[0]);
			expect(receivedEvents[1]).toEqual(events[1]);
		});

		it("should handle streaming with query parameters", async () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.close();
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "text/event-stream" }),
				body: stream,
			});

			const params = { type: "user", since: "2023-01-01" };

			for await (const _event of client.stream("/events", params)) {
				// Process events
			}

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/events?type=user&since=2023-01-01"),
				expect.objectContaining({
					method: "GET",
				}),
			);
		});
	});

	describe("Raw Binary Uploads", () => {
		it("should handle raw binary data uploads", async () => {
			const fileData = new TextEncoder().encode("test file content");
			const responseData = {
				id: "file_123",
				url: "https://storage.test.com/files/file_123",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.putRaw(
				"/files/upload",
				fileData,
				"text/plain",
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/files/upload",
				expect.objectContaining({
					method: "PUT",
					headers: expect.objectContaining({
						"Content-Type": "text/plain",
						Authorization: "Bearer frt_test1234567890abcdef",
					}),
					body: fileData,
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should handle raw binary uploads with custom headers", async () => {
			const fileData = new TextEncoder().encode("test file content");
			const customHeaders = { "X-Custom-Header": "custom-value" };
			const responseData = { id: "file_123" };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.putRaw(
				"/files/upload",
				fileData,
				"text/plain",
				customHeaders,
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/files/upload",
				expect.objectContaining({
					method: "PUT",
					headers: expect.objectContaining({
						"Content-Type": "text/plain",
						"X-Custom-Header": "custom-value",
					}),
					body: fileData,
				}),
			);
			expect(result).toEqual(responseData);
		});

		it("should handle ReadableStream uploads", async () => {
			const streamData = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("test data"));
					controller.close();
				},
			});
			const responseData = { id: "stream_123" };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.putRaw(
				"/streams/upload",
				streamData,
				"application/octet-stream",
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/streams/upload",
				expect.objectContaining({
					method: "PUT",
					headers: expect.objectContaining({
						"Content-Type": "application/octet-stream",
					}),
					body: streamData,
				}),
			);
			expect(result).toEqual(responseData);
		});
	});

	describe("Error Handling", () => {
		it("should propagate HTTP errors from HttpClient", async () => {
			const errorResponse = {
				code: "NOT_FOUND",
				message: "User not found",
				requestId: "req_123",
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => errorResponse,
			});

			await expect(client.get("/users/999")).rejects.toThrow("User not found");
		});

		it("should handle malformed JSON responses", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => {
					throw new Error("Invalid JSON");
				},
			});

			await expect(client.get("/users/123")).rejects.toThrow("Invalid JSON");
		});
	});

	describe("Configuration Integration", () => {
		it("should use custom headers from configuration", async () => {
			const customConfig = createMockConfig({
				headers: { "X-Client-Version": "1.0.0" },
			});
			const customClient = new FrontalClient(customConfig);

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => ({ data: "test" }),
			});

			await customClient.get("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Client-Version": "1.0.0",
					}),
				}),
			);
		});

		it("should use custom timeout from configuration", async () => {
			const customConfig = createMockConfig({ timeout: 1000 });
			const customClient = new FrontalClient(customConfig);

			mockFetch.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						setTimeout(() => reject(new Error("Timeout")), 500);
					}),
			);

			await expect(customClient.get("/test")).rejects.toThrow("Timeout");
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety with schema validation", async () => {
			interface User {
				id: string;
				name: string;
				email: string;
			}

			const userSchema: z.ZodType<User> = z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email(),
			});

			const responseData: User = {
				id: "123",
				name: "John Doe",
				email: "john@example.com",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ "content-type": "application/json" }),
				json: async () => responseData,
			});

			const result = await client.get("/users/123", userSchema);

			// TypeScript should infer the correct type
			expect(result.id).toBe("123");
			expect(result.name).toBe("John Doe");
			expect(result.email).toBe("john@example.com");
		});
	});
});
