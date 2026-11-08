/**
 * Worker entry for the edge smoke test. Runs `@frontal-labs/core` inside the
 * workerd runtime and returns the outcome of the same checks as the Deno and
 * Node smoke tests.
 */
import {
  describeSdkError,
  isFrontalError,
  NetworkError,
  parseFrontalError,
} from "@frontal-labs/core";

export default {
  fetch(): Response {
    const notFound = parseFrontalError(
      { error: { code: "NOT_FOUND", message: "missing frt_live_WORKERKEY1" }, requestId: "req_worker" },
      404
    );
    const network = new NetworkError("socket");
    const clamped = parseFrontalError({ code: "X", message: "m" }, 302);
    const diagnostics = describeSdkError(notFound);

    const checks = {
      status: notFound.statusCode === 404,
      code: notFound.code === "NOT_FOUND",
      coreGuard: isFrontalError(notFound),
      networkNotCore: !isFrontalError(network),
      networkRetryable: network.retryable === true,
      clamped: clamped.statusCode === 500 && clamped.metadata?.rawStatus === 302,
      fingerprint: diagnostics.fingerprint === "frontal/NOT_FOUND",
      redacted: !JSON.stringify(diagnostics).includes("WORKERKEY1"),
    };
    const ok = Object.values(checks).every(Boolean);
    return Response.json({ runtime: "workerd", ok, checks }, { status: ok ? 200 : 500 });
  },
};
