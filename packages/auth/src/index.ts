/**
 * @frontal-labs/auth
 *
 * Authentication and authorization for Frontal.
 */

export { type AuthClientConfig, auth, createAuthClient } from "./client";
export { DEFAULT_AUTH_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { AuthSdk } from "./sdk";
