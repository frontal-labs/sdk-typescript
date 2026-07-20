/**
 * @frontal-labs/governance
 *
 * Policies, compliance, roles, and access control for Frontal.
 */

export {
  governance,
  createGovernanceClient,
  type GovernanceClientConfig,
} from "./client";
export { DEFAULT_GOVERNANCE_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { GovernanceSdk } from "./sdk";
