/**
 * @frontal-labs/integrations
 *
 * Configure and manage Frontal integrations and providers.
 */

export {
  createIntegrationsClient,
  type IntegrationsClientConfig,
  integrations,
} from "./client";
export { DEFAULT_INTEGRATIONS_BASE_URL, VERSION } from "./constants";
export { Integration } from "./integration";
export * from "./schemas";
export { IntegrationsSdk } from "./sdk";
