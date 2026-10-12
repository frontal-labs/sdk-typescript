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
export {
  DeniedError,
  LocalPolicyEngine,
  PolicyEngine,
  PolicyViolationError,
} from "./engine";
export {
  type ConditionMatcher,
  type ConditionValue,
  type Effect,
  allow,
  allowRule,
  commonPolicies,
  conditions,
  definePolicy,
  deny,
  denyRule,
  policies,
  policy,
  type PolicyDefinition,
  type RuleDefinition,
  where,
} from "./policy-dsl";
export {
  type GovernanceInterceptorConfig,
  type GovernOptions,
  govern,
  governanceInterceptor,
  type PolicyContext,
} from "./interceptor";
