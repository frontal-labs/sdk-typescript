/**
 * @frontal-labs/governance
 *
 * Policies, compliance, roles, and access control for Frontal.
 */

export {
  createGovernanceClient,
  type GovernanceClientConfig,
  governance,
} from "./client";
export { DEFAULT_GOVERNANCE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { GovernanceSdk } from "./sdk";
