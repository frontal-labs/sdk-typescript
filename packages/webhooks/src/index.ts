/**
 * @frontal-labs/webhooks
 *
 * Receive and verify Frontal webhook events.
 */

export {
  createWebhooksClient,
  type WebhooksClientConfig,
  webhooks,
} from "./client";
export { DEFAULT_WEBHOOKS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { WebhooksSdk } from "./sdk";
export { extractWebhookEvent, verifyWebhookSignature } from "./verify";
