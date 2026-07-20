/**
 * @frontal-labs/webhooks
 *
 * Receive and verify Frontal webhook events.
 */

export {
  createWebhooksClient,
  webhooks,
  type WebhooksClientConfig,
} from "./client";
export { DEFAULT_WEBHOOKS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { WebhooksSdk } from "./sdk";
export { verifyWebhookSignature, extractWebhookEvent } from "./verify";
