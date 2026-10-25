import type { HttpClient } from "@frontal-labs/core";
import { describe, expect, it, vi } from "vitest";
import { PolicyViolationError } from "../src/engine";
import { governanceInterceptor } from "../src/interceptor";
import { commonPolicies } from "../src/policy-dsl";

/** Minimal HttpClient-shaped fake that records calls and returns canned data. */
function fakeClient(overrides: Partial<Record<string, unknown>> = {}) {
  const post = vi.fn(async () => ({ ok: true }));
  const put = vi.fn(async () => ({ ok: true }));
  const patch = vi.fn(async () => ({ ok: true }));
  const del = vi.fn(async () => ({ ok: true }));
  const get = vi.fn(async () => ({ ok: true }));
  const client = {
    get,
    post,
    put,
    patch,
    delete: del,
    postRaw: vi.fn(async () => ({ ok: true })),
    postFormData: vi.fn(async () => ({ ok: true })),
    putRaw: vi.fn(async () => ({ ok: true })),
    ...overrides,
  } as unknown as HttpClient;
  return { client, spies: { post, put, patch, del, get } };
}

describe("governanceInterceptor", () => {
  it("lets allowed requests through and returns the original result", async () => {
    const { client, spies } = fakeClient();
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(512)],
    })(client);

    const result = await wrapped.post("/functions", { memory: 128 });
    expect(result).toEqual({ ok: true });
    expect(spies.post).toHaveBeenCalledTimes(1);
  });

  it("throws PolicyViolationError and blocks denied mutating requests (failClosed)", async () => {
    const { client, spies } = fakeClient();
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(512)],
    })(client);

    await expect(
      wrapped.post("/functions", { memory: 9999 })
    ).rejects.toBeInstanceOf(PolicyViolationError);
    expect(spies.post).not.toHaveBeenCalled();
  });

  it("invokes the onViolation callback with error and context", async () => {
    const { client } = fakeClient();
    const onViolation = vi.fn();
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(512)],
      onViolation,
    })(client);

    await expect(
      wrapped.put("/functions/x", { memory: 9999 })
    ).rejects.toThrow();
    expect(onViolation).toHaveBeenCalledTimes(1);
    const [error, context] = onViolation.mock.calls[0];
    expect(error).toBeInstanceOf(PolicyViolationError);
    expect(context.method).toBe("put");
    expect(context.path).toBe("/functions/x");
  });

  it("failOpen lets denied requests through when failClosed is false", async () => {
    const { client, spies } = fakeClient();
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(512)],
      failClosed: false,
    })(client);

    const result = await wrapped.post("/functions", { memory: 9999 });
    expect(result).toEqual({ ok: true });
    expect(spies.post).toHaveBeenCalledTimes(1);
  });

  it("does not wrap GET (read-only) requests", async () => {
    const { client, spies } = fakeClient();
    // A policy that would deny everything on read is still bypassed for GET.
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(0)],
    })(client);

    const result = await wrapped.get("/functions");
    expect(result).toEqual({ ok: true });
    expect(spies.get).toHaveBeenCalledTimes(1);
  });

  it("uses a custom buildInput when provided", async () => {
    const { client } = fakeClient();
    const buildInput = vi.fn(() => ({ body: { memory: 9999 } }));
    const wrapped = governanceInterceptor({
      policies: [commonPolicies.memoryLimit(512)],
      buildInput,
    })(client);

    await expect(wrapped.post("/functions", { body: {} })).rejects.toThrow();
    expect(buildInput).toHaveBeenCalledTimes(1);
  });
});
