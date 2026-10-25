/**
 * Offline stand-in for the Frontal backend, for running scripts/live-backend-compat.ts
 * without credentials. It serves only the routes listed in
 * contracts/sdk-endpoints.json and returns 404 for anything else, so a route
 * mismatch in the SDK shows up as a failure. It does not validate payloads or
 * prove the real service behaves this way.
 *
 * Usage:
 *   bun scripts/contract-mock-server.ts contracts/sdk-endpoints.json 8787
 *   FRONTAL_API_KEY=frt_mock_key_1234567890 FRONTAL_API_URL=http://localhost:8787/v1 \
 *     FRONTAL_AI_API_URL=http://localhost:8787 FRONTAL_BLOB_BUCKET=test-bucket \
 *     bun scripts/live-backend-compat.ts
 */
import { readFileSync } from "node:fs";

export type ContractEntry = { method: string; path: string };
export type Contract = Record<string, ContractEntry[]>;

interface Route {
  method: string;
  segments: string[];
  query: [string, string][];
}

/** Maps contract-only method names to the HTTP method the SDK sends. */
const HTTP_METHOD: Record<string, string> = {
  GETRAW: "GET",
  STREAM: "GET", // core's stream helpers send GET (see packages/core/src/http.ts)
  POSTFORMDATA: "POST",
};

function toRoute(entry: ContractEntry): Route {
  const [path, search = ""] = entry.path.split("?");
  return {
    method: HTTP_METHOD[entry.method] ?? entry.method,
    segments: (path ?? "").split("/").filter(Boolean),
    query: [...new URLSearchParams(search)],
  };
}

function matches(route: Route, method: string, url: URL): boolean {
  if (route.method !== method) return false;
  const requested = url.pathname.split("/").filter(Boolean);
  if (requested.length !== route.segments.length) return false;
  const pathOk = route.segments.every((seg, i) =>
    seg.startsWith("{") && seg.endsWith("}") ? requested[i] !== "" : seg === requested[i]
  );
  if (!pathOk) return false;
  return route.query.every(([key, value]) => url.searchParams.get(key) === value);
}

/** Builds a fetch handler that answers only contract routes. */
export function createContractMock(contract: Contract) {
  const routes = Object.values(contract).flat().map(toRoute);
  return (req: Request): Response => {
    const url = new URL(req.url);
    // The SDK base URL for api.frontal.dev includes /v1; contract paths do not.
    if (url.pathname.startsWith("/v1/")) {
      url.pathname = url.pathname.slice(3);
    }
    if (!routes.some((r) => matches(r, req.method, url))) {
      return Response.json(
        { code: "NOT_FOUND", message: `no route ${req.method} ${url.pathname}` },
        { status: 404 }
      );
    }
    return Response.json({
      data: [],
      items: [],
      models: [],
      object: "list",
      pagination: { hasMore: false },
    });
  };
}

if (import.meta.main) {
  const contractPath = process.argv[2] ?? "contracts/sdk-endpoints.json";
  const port = Number(process.argv[3] ?? 8787);
  const contract = JSON.parse(readFileSync(contractPath, "utf8")) as Contract;
  const handler = createContractMock(contract);
  Bun.serve({ port, fetch: handler });
  console.log(`contract mock on :${port} (${Object.values(contract).flat().length} routes)`);
}
