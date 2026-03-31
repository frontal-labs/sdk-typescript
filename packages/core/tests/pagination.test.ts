/**
 * Comprehensive tests for pagination utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createPageResult, pageResultSchema } from "../src/pagination";
import {
	cleanupMocks,
	createMockPaginationMeta,
	createMockResponseMeta,
} from "./setup";

// Create a simple schema for testing
const testItemSchema = z.object({
	id: z.number(),
	name: z.string(),
});

const testPageResultSchema = pageResultSchema(testItemSchema);

// Create a schema for real-world scenario with string IDs
const realWorldItemSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const realWorldPageResultSchema = pageResultSchema(realWorldItemSchema);

describe("Pagination", () => {
	beforeEach(() => {
		cleanupMocks();
	});

	afterEach(() => {
		cleanupMocks();
	});

	describe("createPageResult", () => {
		it("should create a valid PageResult with all parameters", () => {
			const data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
				{ id: 3, name: "Item 3" },
			];
			const pagination = createMockPaginationMeta({
				cursor: "cursor_123",
				hasMore: true,
				total: 100,
				limit: 3,
				offset: 0,
			});
			const meta = createMockResponseMeta({
				requestId: "req_456",
				timestamp: new Date(),
			});

			let callCount = 0;
			const fetchNextPage = vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					return createPageResult(
						[{ id: 4, name: "Item 4" }],
						createMockPaginationMeta({
							cursor: "cursor_456",
							hasMore: false,
							limit: 3,
						}),
						async () => null,
						meta,
					);
				}
				return null;
			});

			const pageResult = createPageResult(
				data,
				pagination,
				fetchNextPage,
				meta,
			);

			// Test basic properties
			expect(pageResult.data).toEqual(data);
			expect(pageResult.pagination).toEqual(pagination);
			expect(pageResult.meta).toEqual(meta);

			// Test methods
			expect(typeof pageResult.nextPage).toBe("function");
			expect(typeof pageResult.all).toBe("function");
			expect(Symbol.asyncIterator in pageResult).toBe(true);
		});

		it("should create a PageResult without meta", () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: false });
			const fetchNextPage = vi.fn().mockResolvedValue(null);

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			expect(pageResult.data).toEqual(data);
			expect(pageResult.pagination).toEqual(pagination);
			expect(pageResult.meta).toBeUndefined();
		});

		it("should handle empty data array", () => {
			const data: any[] = [];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const fetchNextPage = vi.fn().mockResolvedValue(null);

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			expect(pageResult.data).toEqual([]);
			expect(pageResult.data).toHaveLength(0);
		});

		it("should handle null fetchNextPage", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: false });

			const pageResult = createPageResult(data, pagination, async () => null);

			const nextPage = await pageResult.nextPage();
			expect(nextPage).toBeNull();
		});
	});

	describe("PageResult.nextPage", () => {
		it("should fetch the next page when hasMore is true", async () => {
			const firstPageData = [{ id: 1, name: "Item 1" }];
			const secondPageData = [{ id: 2, name: "Item 2" }];

			const firstPagination = createMockPaginationMeta({ hasMore: true });
			const secondPagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValue(
					createPageResult(secondPageData, secondPagination, async () => null),
				);

			const pageResult = createPageResult(
				firstPageData,
				firstPagination,
				fetchNextPage,
			);

			const nextPage = await pageResult.nextPage();

			expect(nextPage).not.toBeNull();
			expect(nextPage?.data).toEqual(secondPageData);
			expect(nextPage?.pagination.hasMore).toBe(false);
			expect(fetchNextPage).toHaveBeenCalledTimes(1);
		});

		it("should return null when hasMore is false", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: false });
			const fetchNextPage = vi.fn();

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const nextPage = await pageResult.nextPage();

			expect(nextPage).toBeNull();
			expect(fetchNextPage).not.toHaveBeenCalled();
		});

		it("should handle fetchNextPage errors", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const fetchNextPage = vi
				.fn()
				.mockRejectedValue(new Error("Network error"));

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			await expect(pageResult.nextPage()).rejects.toThrow("Network error");
		});

		it("should handle fetchNextPage returning null", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const fetchNextPage = vi.fn().mockResolvedValue(null);

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const nextPage = await pageResult.nextPage();

			expect(nextPage).toBeNull();
			expect(fetchNextPage).toHaveBeenCalledTimes(1);
		});
	});

	describe("PageResult.all", () => {
		it("should collect all items from all pages", async () => {
			const page1Data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			];
			const page2Data = [{ id: 3, name: "Item 3" }];
			const page3Data = [
				{ id: 4, name: "Item 4" },
				{ id: 5, name: "Item 5" },
			];

			const page1Pagination = createMockPaginationMeta({ hasMore: true });
			const page2Pagination = createMockPaginationMeta({ hasMore: true });
			const page3Pagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValueOnce(
					createPageResult(page2Data, page2Pagination, async () => null),
				)
				.mockResolvedValueOnce(
					createPageResult(page3Data, page3Pagination, async () => null),
				);

			const pageResult = createPageResult(
				page1Data,
				page1Pagination,
				fetchNextPage,
			);

			const allItems = await pageResult.all();

			expect(allItems).toEqual([...page1Data, ...page2Data, ...page3Data]);
			expect(allItems).toHaveLength(5);
			expect(fetchNextPage).toHaveBeenCalledTimes(2);
		});

		it("should return current page data when hasMore is false", async () => {
			const data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			];
			const pagination = createMockPaginationMeta({ hasMore: false });
			const fetchNextPage = vi.fn();

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const allItems = await pageResult.all();

			expect(allItems).toEqual(data);
			expect(allItems).toHaveLength(2);
			expect(fetchNextPage).not.toHaveBeenCalled();
		});

		it("should handle empty first page", async () => {
			const data: any[] = [];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const nextPageData = [{ id: 1, name: "Item 1" }];
			const nextPagePagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValue(
					createPageResult(nextPageData, nextPagePagination, async () => null),
				);

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const allItems = await pageResult.all();

			expect(allItems).toEqual(nextPageData);
			expect(allItems).toHaveLength(1);
		});

		it("should handle errors during page fetching", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const fetchNextPage = vi
				.fn()
				.mockRejectedValue(new Error("Network error"));

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			await expect(pageResult.all()).rejects.toThrow("Network error");
		});
	});

	describe("PageResult async iterator", () => {
		it("should iterate over all items across pages", async () => {
			const page1Data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			];
			const page2Data = [{ id: 3, name: "Item 3" }];
			const page3Data = [{ id: 4, name: "Item 4" }];

			const page1Pagination = createMockPaginationMeta({ hasMore: true });
			const page2Pagination = createMockPaginationMeta({ hasMore: true });
			const page3Pagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValueOnce(
					createPageResult(page2Data, page2Pagination, async () => null),
				)
				.mockResolvedValueOnce(
					createPageResult(page3Data, page3Pagination, async () => null),
				);

			const pageResult = createPageResult(
				page1Data,
				page1Pagination,
				fetchNextPage,
			);

			const allItems = [];
			for await (const item of pageResult) {
				allItems.push(item);
			}

			expect(allItems).toEqual([...page1Data, ...page2Data, ...page3Data]);
			expect(allItems).toHaveLength(4);
			expect(fetchNextPage).toHaveBeenCalledTimes(2);
		});

		it("should iterate over single page when hasMore is false", async () => {
			const data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			];
			const pagination = createMockPaginationMeta({ hasMore: false });
			const fetchNextPage = vi.fn();

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const allItems = [];
			for await (const item of pageResult) {
				allItems.push(item);
			}

			expect(allItems).toEqual(data);
			expect(allItems).toHaveLength(2);
			expect(fetchNextPage).not.toHaveBeenCalled();
		});

		it("should handle empty pages during iteration", async () => {
			const page1Data: any[] = [];
			const page2Data = [{ id: 1, name: "Item 1" }];
			const page3Data: any[] = [];
			const page4Data = [{ id: 2, name: "Item 2" }];

			const page1Pagination = createMockPaginationMeta({ hasMore: true });
			const page2Pagination = createMockPaginationMeta({ hasMore: true });
			const page3Pagination = createMockPaginationMeta({ hasMore: true });
			const page4Pagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValueOnce(
					createPageResult(page2Data, page2Pagination, async () => null),
				)
				.mockResolvedValueOnce(
					createPageResult(page3Data, page3Pagination, async () => null),
				)
				.mockResolvedValueOnce(
					createPageResult(page4Data, page4Pagination, async () => null),
				);

			const pageResult = createPageResult(
				page1Data,
				page1Pagination,
				fetchNextPage,
			);

			const allItems = [];
			for await (const item of pageResult) {
				allItems.push(item);
			}

			expect(allItems).toEqual([page2Data[0], page4Data[0]]);
			expect(allItems).toHaveLength(2);
		});

		it("should stop iteration on error", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const fetchNextPage = vi
				.fn()
				.mockRejectedValue(new Error("Network error"));

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			const allItems = [];
			try {
				for await (const item of pageResult) {
					allItems.push(item);
				}
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
			}

			expect(allItems).toEqual(data);
			expect(allItems).toHaveLength(1);
		});
	});

	describe("PageResult behavior with complex scenarios", () => {
		it("should handle large number of pages efficiently", async () => {
			const itemsPerPage = 10;
			const totalPages = 5;
			const allData = Array.from(
				{ length: totalPages * itemsPerPage },
				(_, i) => ({
					id: i + 1,
					name: `Item ${i + 1}`,
				}),
			);

			const pageResults = [];
			for (let i = 0; i < totalPages; i++) {
				const start = i * itemsPerPage;
				const end = start + itemsPerPage;
				const pageData = allData.slice(start, end);
				const hasMore = i < totalPages - 1;

				const pagination = createMockPaginationMeta({ hasMore });
				const fetchNextPage =
					i < totalPages - 1
						? vi.fn().mockResolvedValue(null) // Will be set later
						: vi.fn().mockResolvedValue(null);

				pageResults.push(createPageResult(pageData, pagination, fetchNextPage));
			}

			// Chain the fetchNextPage functions
			for (let i = 0; i < pageResults.length - 1; i++) {
				pageResults[i]._fetchNextPage = async () => pageResults[i + 1];
			}

			const firstPage = pageResults[0];
			const collectedItems = await firstPage.all();

			expect(collectedItems).toEqual(allData);
			expect(collectedItems).toHaveLength(totalPages * itemsPerPage);
		});

		it("should maintain metadata across pages", async () => {
			const meta1 = createMockResponseMeta({ requestId: "req_1" });
			const meta2 = createMockResponseMeta({ requestId: "req_2" });
			const meta3 = createMockResponseMeta({ requestId: "req_3" });

			const page1Data = [{ id: 1, name: "Item 1" }];
			const page2Data = [{ id: 2, name: "Item 2" }];
			const page3Data = [{ id: 3, name: "Item 3" }];

			const page1Pagination = createMockPaginationMeta({ hasMore: true });
			const page2Pagination = createMockPaginationMeta({ hasMore: true });
			const page3Pagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValueOnce(
					createPageResult(page2Data, page2Pagination, async () => null, meta2),
				)
				.mockResolvedValueOnce(
					createPageResult(page3Data, page3Pagination, async () => null, meta3),
				);

			const pageResult = createPageResult(
				page1Data,
				page1Pagination,
				fetchNextPage,
				meta1,
			);

			// Check first page metadata
			expect(pageResult.meta?.requestId).toBe("req_1");

			// Check second page metadata
			const page2 = await pageResult.nextPage();
			expect(page2?.meta?.requestId).toBe("req_2");

			// Check third page metadata
			const page3 = await page2?.nextPage();
			expect(page3?.meta?.requestId).toBe("req_3");
		});

		it("should handle concurrent nextPage calls", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });
			const nextPageData = [{ id: 2, name: "Item 2" }];
			const nextPagePagination = createMockPaginationMeta({ hasMore: false });

			let resolvePromise: (value: any) => void;
			const fetchNextPage = vi.fn().mockImplementation(() => {
				return new Promise((resolve) => {
					resolvePromise = resolve;
				});
			});

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			// Start two concurrent nextPage calls
			const nextPagePromise1 = pageResult.nextPage();
			const nextPagePromise2 = pageResult.nextPage();

			// Resolve the promise
			resolvePromise?.(
				createPageResult(nextPageData, nextPagePagination, async () => null),
			);

			// Both promises should resolve to the same result
			const result1 = await nextPagePromise1;
			const result2 = await nextPagePromise2;

			expect(result1).toEqual(result2);
			expect(result1?.data).toEqual(nextPageData);
			expect(fetchNextPage).toHaveBeenCalledTimes(1);
		});
	});

	describe("pageResultSchema", () => {
		it("should validate complete page result structure", () => {
			const validPageResult = {
				data: [
					{ id: 1, name: "Item 1" },
					{ id: 2, name: "Item 2" },
				],
				meta: {
					requestId: "req_123",
					timestamp: new Date(),
					version: "1.0.0",
				},
				pagination: {
					cursor: "cursor_123",
					hasMore: true,
					total: 100,
				},
			};

			const result = testPageResultSchema.parse(validPageResult);

			expect(result.data).toHaveLength(2);
			expect(result.meta?.requestId).toBe("req_123");
			expect(result.pagination.hasMore).toBe(true);
		});

		it("should validate minimal page result structure", () => {
			const minimalPageResult = {
				data: [],
				pagination: {
					cursor: "cursor_123",
					hasMore: false,
				},
			};

			const result = testPageResultSchema.parse(minimalPageResult);

			expect(result.data).toEqual([]);
			expect(result.meta).toBeUndefined();
			expect(result.pagination.hasMore).toBe(false);
		});

		it("should reject invalid page result structures", () => {
			const invalidPageResults = [
				{
					// Missing data
					pagination: { cursor: "cursor", hasMore: false },
				},
				{
					data: [],
					// Missing pagination
				},
				{
					data: "not-an-array",
					pagination: { cursor: "cursor", hasMore: false },
				},
				{
					data: [],
					pagination: {
						cursor: "cursor",
						// Missing hasMore
					},
				},
			];

			invalidPageResults.forEach((pageResult) => {
				expect(() => testPageResultSchema.parse(pageResult)).toThrow();
			});
		});

		it("should reject invalid meta structure", () => {
			const invalidPageResults = [
				{
					data: [],
					pagination: { cursor: "cursor", hasMore: false },
					meta: {
						// Missing required fields
						timestamp: new Date(),
					},
				},
				{
					data: [],
					pagination: { cursor: "cursor", hasMore: false },
					meta: {
						requestId: "req_123",
						timestamp: "not-a-date", // Should be Date
					},
				},
			];

			invalidPageResults.forEach((pageResult) => {
				expect(() => testPageResultSchema.parse(pageResult)).toThrow();
			});
		});

		it("should reject invalid pagination structure", () => {
			const invalidPageResults = [
				{
					data: [],
					pagination: {
						// Missing required fields
					},
				},
				{
					data: [],
					pagination: {
						cursor: "cursor",
						hasMore: "false", // Should be boolean
					},
				},
				{
					data: [],
					pagination: {
						cursor: 123, // Should be string
						hasMore: false,
					},
				},
			];

			invalidPageResults.forEach((pageResult) => {
				expect(() => testPageResultSchema.parse(pageResult)).toThrow();
			});
		});
	});

	describe("Integration with real-world scenarios", () => {
		it("should handle API response with cursor-based pagination", async () => {
			// Simulate a typical API response
			const apiResponse = {
				data: [
					{ id: "user_1", name: "John Doe", email: "john@example.com" },
					{ id: "user_2", name: "Jane Smith", email: "jane@example.com" },
				],
				meta: {
					requestId: "req_users_123",
					timestamp: new Date(),
					version: "1.0.0",
				},
				pagination: {
					cursor: "eyJpZCI6InVzZXJfMiJ9", // Base64 encoded cursor
					hasMore: true,
					total: 1000,
				},
			};

			// Validate the response
			const validatedResponse = realWorldPageResultSchema.parse(apiResponse);

			// Create PageResult with mock fetch function
			let callCount = 0;
			const fetchNextPage = vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount <= 3) {
					// Simulate 3 more pages
					return createPageResult(
						[{ id: `user_${callCount + 2}`, name: `User ${callCount + 2}` }],
						createMockPaginationMeta({
							cursor: `cursor_${callCount + 2}`,
							hasMore: callCount < 3,
						}),
						async () => null,
					);
				}
				return null;
			});

			const pageResult = createPageResult(
				validatedResponse.data,
				validatedResponse.pagination,
				fetchNextPage,
				validatedResponse.meta,
			);

			// Test iteration
			const allUsers = [];
			for await (const user of pageResult) {
				allUsers.push(user);
			}

			expect(allUsers).toHaveLength(5); // 2 initial + 3 more pages
			expect(allUsers[0]).toEqual({
				id: "user_1",
				name: "John Doe",
				email: "john@example.com",
			});
			expect(fetchNextPage).toHaveBeenCalledTimes(3);
		});

		it("should handle error scenarios gracefully", async () => {
			const data = [{ id: 1, name: "Item 1" }];
			const pagination = createMockPaginationMeta({ hasMore: true });

			// Simulate network error on second page
			const fetchNextPage = vi
				.fn()
				.mockRejectedValue(new Error("Network timeout"));

			const pageResult = createPageResult(data, pagination, fetchNextPage);

			// Should still be able to access current page data
			expect(pageResult.data).toEqual(data);
			expect(pageResult.data).toHaveLength(1);

			// But nextPage should throw
			await expect(pageResult.nextPage()).rejects.toThrow("Network timeout");

			// And all() should also throw
			await expect(pageResult.all()).rejects.toThrow("Network timeout");
		});

		it("should handle mixed data types in pages", async () => {
			const page1Data = [
				{ id: 1, type: "user", data: { name: "John" } },
				{ id: 2, type: "post", data: { title: "Hello World" } },
			];
			const page2Data = [
				{ id: 3, type: "comment", data: { text: "Nice post!" } },
			];

			const page1Pagination = createMockPaginationMeta({ hasMore: true });
			const page2Pagination = createMockPaginationMeta({ hasMore: false });

			const fetchNextPage = vi
				.fn()
				.mockResolvedValue(
					createPageResult(page2Data, page2Pagination, async () => null),
				);

			const pageResult = createPageResult(
				page1Data,
				page1Pagination,
				fetchNextPage,
			);

			const allItems = await pageResult.all();

			expect(allItems).toHaveLength(3);
			expect(allItems[0].type).toBe("user");
			expect(allItems[1].type).toBe("post");
			expect(allItems[2].type).toBe("comment");
		});
	});
});
