/**
 * @frontal-labs/auth
 *
 * Authentication and authorization for Frontal.
 */

export { createAuthClient, auth, type AuthClientConfig } from "./client";
export { DEFAULT_AUTH_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { AuthSdk } from "./sdk";
