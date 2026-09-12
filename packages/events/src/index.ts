/**
 * @frontal-labs/events
 *
 * Event-driven architecture and messaging for Frontal.
 */

export type { EventBufferConfig } from "./buffer";
export { EventBuffer } from "./buffer";
export { createEventsClient, type EventsClientConfig, events } from "./client";
export { DEFAULT_EVENTS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { EventsSdk } from "./sdk";
