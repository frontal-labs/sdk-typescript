import { createTestHttpClient } from "frontal/testing";
import { describe, expect, it, vi } from "vitest";
import { WorkersSdk } from "../src/sdk";

function createService(
  routes: Parameters<typeof createTestHttpClient>[0] = []
) {
  const { http, mock } = createTestHttpClient(routes);
  return { service: new WorkersSdk(http), mock };
}

describe("WorkersSdk", () => {
  it("deploys a worker at POST /workers with snake_case env_vars", async () => {
    const { service, mock } = createService([
      { method: "POST", path: "/workers", body: { name: "hello" } },
    ]);
    const res = await service.deploy({
      name: "hello",
      code: "export default () => new Response('hi')",
      entrypoint: "default",
      envVars: { GREETING: "hi" },
    });
    expect(res.name).toBe("hello");
    mock.expectCalledWith("POST", "/workers", { name: "hello" });
    expect(
      mock.requests.some((r: { path: string }) => r.path.includes("/v1/v1/"))
    ).toBe(false);
  });

  it("invokes a deployed worker by path (raw Response)", async () => {
    const { http } = createTestHttpClient([]);
    const getRawSpy = vi
      .spyOn(http as unknown as { getRaw: () => Promise<Response> }, "getRaw")
      .mockResolvedValue(new Response("hi", { status: 200 }));
    const service = new WorkersSdk(http);

    const res = await service.invoke("hello", { path: "/greet" });
    expect(res.status).toBe(200);
    expect(getRawSpy).toHaveBeenCalledWith(
      "/workers/hello/greet",
      undefined,
      undefined
    );
    getRawSpy.mockRestore();
  });

  it("invokes with POST via postRaw", async () => {
    const { http } = createTestHttpClient([]);
    const postRawSpy = vi
      .spyOn(http as unknown as { postRaw: () => Promise<Response> }, "postRaw")
      .mockResolvedValue(new Response("{}", { status: 201 }));
    const service = new WorkersSdk(http);

    const res = await service.invoke("hello", {
      method: "POST",
      path: "/submit",
      body: JSON.stringify({ a: 1 }),
    });
    expect(res.status).toBe(201);
    expect(postRawSpy).toHaveBeenCalledWith(
      "/workers/hello/submit",
      JSON.stringify({ a: 1 }),
      undefined
    );
    postRawSpy.mockRestore();
  });
});
