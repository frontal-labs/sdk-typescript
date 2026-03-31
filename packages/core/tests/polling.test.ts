import { describe, expect, it, vi } from "vitest";
import { TimeoutError } from "../src/errors";
import { pollUntil, withTimeout } from "../src/polling";

describe("pollUntil", () => {
	it("resolves immediately when condition is met on first call", async () => {
		const fn = vi.fn().mockResolvedValue({ status: "completed" });
		const result = await pollUntil(fn, {
			until: (r) => r.status === "completed",
		});
		expect(result).toEqual({ status: "completed" });
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("polls until condition is met", async () => {
		let count = 0;
		const fn = vi.fn().mockImplementation(async () => {
			count++;
			return { status: count >= 3 ? "completed" : "running" };
		});

		const result = await pollUntil(fn, {
			until: (r) => r.status === "completed",
			interval: 10,
			timeout: 5000,
		});

		expect(result).toEqual({ status: "completed" });
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("throws TimeoutError when timeout exceeded", async () => {
		const fn = vi.fn().mockResolvedValue({ status: "running" });

		await expect(
			pollUntil(fn, {
				until: (r) => r.status === "completed",
				interval: 10,
				timeout: 50,
			}),
		).rejects.toThrow(TimeoutError);
	});

	it("uses default truthy check when no until provided", async () => {
		let count = 0;
		const fn = vi.fn().mockImplementation(async () => {
			count++;
			return count >= 2 ? { data: "result" } : null;
		});

		const result = await pollUntil(fn, { interval: 10, timeout: 5000 });
		expect(result).toEqual({ data: "result" });
	});

	it("respects AbortSignal", async () => {
		const controller = new AbortController();
		const fn = vi.fn().mockImplementation(async () => {
			controller.abort();
			return { status: "running" };
		});

		await expect(
			pollUntil(fn, {
				until: (r) => r.status === "completed",
				interval: 10,
				signal: controller.signal,
			}),
		).rejects.toThrow("Polling aborted");
	});

	it("supports exponential backoff", async () => {
		let count = 0;
		const fn = vi.fn().mockImplementation(async () => {
			count++;
			return count >= 3 ? "done" : null;
		});

		const result = await pollUntil(fn, {
			interval: 10,
			backoff: "exponential",
			timeout: 5000,
		});

		expect(result).toBe("done");
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe("withTimeout", () => {
	it("resolves when promise completes before timeout", async () => {
		const promise = Promise.resolve("result");
		const result = await withTimeout(promise, 1000);
		expect(result).toBe("result");
	});

	it("throws TimeoutError when promise exceeds timeout", async () => {
		const promise = new Promise((resolve) =>
			setTimeout(() => resolve("late"), 5000),
		);

		await expect(withTimeout(promise, 50)).rejects.toThrow(TimeoutError);
	});

	it("uses custom error message", async () => {
		const promise = new Promise((resolve) =>
			setTimeout(() => resolve("late"), 5000),
		);

		await expect(withTimeout(promise, 50, "Custom timeout")).rejects.toThrow(
			"Custom timeout",
		);
	});

	it("propagates rejection from the original promise", async () => {
		const promise = Promise.reject(new Error("original error"));

		await expect(withTimeout(promise, 1000)).rejects.toThrow("original error");
	});
});

describe("TimeoutError", () => {
	it("has correct name and message", () => {
		const err = new TimeoutError("test timeout");
		expect(err.name).toBe("TimeoutError");
		expect(err.message).toBe("test timeout");
		expect(err).toBeInstanceOf(Error);
	});

	it("uses default message", () => {
		const err = new TimeoutError();
		expect(err.message).toBe("Operation timed out");
	});
});
