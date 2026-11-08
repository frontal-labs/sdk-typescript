# Sources for contract guidance

Primary sources behind the contract defaults. Cite these when an audit finding needs external evidence.

- [Google AIP-193: Errors](https://google.aip.dev/193) for stable machine identity, structured dynamic values, audience-specific messages, and help links.
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) for machine identity, HTTP status, prose that clients should not parse, extensibility, and disclosure risks.
- [Node.js errors](https://nodejs.org/api/errors.html#errorcode) for stable `error.code` and standard `Error.cause`.
- [OpenTelemetry error attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/#error-type) for stable error-type guidance.
- The development-status [OpenTelemetry recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/) guidance for final outcomes and duplicate recording.
- [OWASP error handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html#objective) and [logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude) for public disclosure, trust, redaction, and limited diagnostics.
- [MCP tool results and errors](https://modelcontextprotocol.io/specification/latest/server/tools#error-handling) for structured tool failures, untrusted annotations, result validation, and human control of sensitive actions.
- [MDN `Access-Control-Expose-Headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers) for browser access to cross-origin response headers.
- [`@frontal-labs/error` factory source](https://github.com/frontal-labs/error/blob/main/src/create.ts), [value types](https://github.com/frontal-labs/error/blob/main/src/types.ts), and [response data](https://github.com/frontal-labs/error/blob/main/src/response-data.ts) for current package behavior.
