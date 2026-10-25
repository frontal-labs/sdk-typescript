import { describe, expect, it } from "vitest";
import { createContractMock } from "../scripts/contract-mock-server";

const contract = {
  agents: [{ method: "STREAM", path: "/agents/runs/{param}/stream" }],
  auth: [
    { method: "POST", path: "/auth/token?grant_type=password" },
    { method: "POST", path: "/auth/token?grant_type=refresh_token" },
  ],
  blob: [{ method: "POSTFORMDATA", path: "/blob/object/{param}/{param}" }],
};

const handler = createContractMock(contract);
const call = (method: string, path: string) =>
  handler(new Request(`https://api.example.test${path}`, { method }));

describe("createContractMock", () => {
  it("serves STREAM routes as GET", () => {
    expect(call("GET", "/agents/runs/run_1/stream").status).toBe(200);
  });

  it("does not serve a STREAM route for POST", () => {
    expect(call("POST", "/agents/runs/run_1/stream").status).toBe(404);
  });

  it("matches query-qualified routes with their query string", () => {
    expect(call("POST", "/auth/token?grant_type=password").status).toBe(200);
    expect(call("POST", "/auth/token?grant_type=refresh_token").status).toBe(200);
  });

  it("returns 404 for a query-qualified route with an unlisted grant", () => {
    expect(call("POST", "/auth/token?grant_type=pkce").status).toBe(404);
    expect(call("POST", "/auth/token").status).toBe(404);
  });

  it("maps POSTFORMDATA to POST and matches parameter segments", () => {
    expect(call("POST", "/blob/object/my-bucket/docs/file.txt").status).toBe(404);
    expect(call("POST", "/blob/object/my-bucket/file.txt").status).toBe(200);
  });

  it("strips a /v1 prefix from requests", () => {
    expect(call("GET", "/v1/agents/runs/run_1/stream").status).toBe(200);
  });

  it("returns 404 for unknown paths", () => {
    expect(call("GET", "/nope").status).toBe(404);
  });
});
