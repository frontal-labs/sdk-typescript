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
export {
  DeniedError,
  LocalPolicyEngine,
  PolicyEngine,
  PolicyViolationError,
} from "./engine";
export {
  type GovernanceInterceptorConfig,
  type GovernOptions,
  govern,
  governanceInterceptor,
  type PolicyContext,
} from "./interceptor";
export {
  allow,
  allowRule,
  type ConditionMatcher,
  type ConditionValue,
  commonPolicies,
  conditions,
  definePolicy,
  deny,
  denyRule,
  type Effect,
  type PolicyDefinition,
  policies,
  policy,
  type RuleDefinition,
  where,
} from "./policy-dsl";
export * from "./schemas";
export { GovernanceSdk } from "./sdk";
