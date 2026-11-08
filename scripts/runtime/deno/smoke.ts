/**
 * Deno smoke test for the built `@frontal-labs/core` bundle. Exercises error
 * construction, the library-backed guards and the status clamp, which are the
 * parts that depend on the bundled `@frontal-labs/error`.
 */
import {
  describeSdkError,
  isFrontalError,
  NetworkError,
  parseFrontalError,
} from "../../../packages/core/dist/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`deno smoke: ${message}`);
}

const notFound = parseFrontalError(
  { error: { code: "NOT_FOUND", message: "missing frt_live_DENOKEY1" }, requestId: "req_deno" },
  404
);
assert(notFound.statusCode === 404, "status is preserved");
assert(notFound.code === "NOT_FOUND", "code is preserved");
assert(isFrontalError(notFound), "core guard recognises its own error");

const network = new NetworkError("socket");
assert(!isFrontalError(network), "core guard does not match NetworkError");
assert(network.retryable === true, "NetworkError is retryable");

const clamped = parseFrontalError({ code: "X", message: "m" }, 302);
assert(clamped.statusCode === 500, "out-of-range status is clamped to 500");
assert(clamped.metadata?.rawStatus === 302, "raw status is kept in metadata");

const diagnostics = describeSdkError(notFound);
assert(diagnostics.fingerprint === "frontal/NOT_FOUND", "fingerprint is scope/code");
assert(!JSON.stringify(diagnostics).includes("DENOKEY1"), "API keys are redacted");

console.log(JSON.stringify({ runtime: "deno", ok: true, fingerprint: diagnostics.fingerprint }));
