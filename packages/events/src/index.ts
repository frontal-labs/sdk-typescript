/**
 * @frontal-labs/events
 *
 * Event-driven architecture and messaging for Frontal.
 */

export { createEventsClient, events, type EventsClientConfig } from "./client";
export type { EventBufferConfig } from "./buffer";
export { EventBuffer } from "./buffer";
export { DEFAULT_EVENTS_BASE_URL, VERSION } from "./constants";
export * from "./schemas";
export { EventsSdk } from "./sdk";
