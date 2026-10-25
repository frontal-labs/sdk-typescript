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
const CONTRACT = process.argv[2];
const PORT = Number(process.argv[3] ?? 8787);
const contract = JSON.parse(await Bun.file(CONTRACT).text()) as Record<
  string,
  { method: string; path: string }[]
>;

const routes = Object.values(contract)
  .flat()
  .map((e) => {
    const method = e.method === "GETRAW" ? "GET" : e.method === "POSTFORMDATA" ? "POST" : e.method;
    const re = new RegExp(
      "^" + e.path.replace(/\{param\}/g, "[^/]+").replace(/\//g, "\\/") + "$"
    );
    return { method, re };
  });

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path.startsWith("/v1/")) path = path.slice(3);
    const hit = routes.some((r) => r.method === req.method && r.re.test(path));
    if (!hit) {
      return Response.json({ code: "NOT_FOUND", message: `no route ${req.method} ${path}` }, { status: 404 });
    }
    return Response.json({ data: [], items: [], pagination: { hasMore: false }, models: [], object: "list" });
  },
});
console.log(`mock backend on :${PORT} with ${routes.length} routes`);
