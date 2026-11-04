/**
 * The single place where a caller-declared type is accepted without a runtime
 * check.
 *
 * Most endpoints declare their response type at the call site, and no schema
 * checks the wire shape yet. Every such result passes through this function, so
 * the trust decision is made once, here, and can be searched for. Replace a use
 * with a schema-validated parse when the endpoint gets a contract.
 */
export function declaredResponse<T>(value: unknown): T {
  return value as T;
}
