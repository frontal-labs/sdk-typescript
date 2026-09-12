import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { EventsSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new EventsSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["sdk.publish", () => sdk.publish("r_1", {}), "POST", /\/events\/publish$/],
  [
    "sdk.subscribe",
    () => sdk.subscribe("r_1", {}),
    "POST",
    /\/events\/subscriptions$/,
  ],
  [
    "sdk.unsubscribe",
    () => sdk.unsubscribe("r_1"),
    "DELETE",
    /\/events\/subscriptions\/[^/]+$/,
  ],
  ["sdk.topics.list", () => sdk.topics.list({}), "GET", /\/events\/topics$/],
  [
    "sdk.topics.create",
    () => sdk.topics.create({}),
    "POST",
    /\/events\/topics$/,
  ],
  [
    "sdk.topics.get",
    () => sdk.topics.get("r_1"),
    "GET",
    /\/events\/topics\/[^/]+$/,
  ],
  [
    "sdk.topics.update",
    () => sdk.topics.update("r_1", {}),
    "PUT",
    /\/events\/topics\/[^/]+$/,
  ],
  [
    "sdk.topics.delete",
    () => sdk.topics.delete("r_1"),
    "DELETE",
    /\/events\/topics\/[^/]+$/,
  ],
  [
    "sdk.subscriptions.list",
    () => sdk.subscriptions.list({}),
    "GET",
    /\/events\/subscriptions$/,
  ],
  [
    "sdk.subscriptions.create",
    () => sdk.subscriptions.create({}),
    "POST",
    /\/events\/subscriptions$/,
  ],
  [
    "sdk.subscriptions.get",
    () => sdk.subscriptions.get("r_1"),
    "GET",
    /\/events\/subscriptions\/[^/]+$/,
  ],
  [
    "sdk.subscriptions.update",
    () => sdk.subscriptions.update("r_1", {}),
    "PUT",
    /\/events\/subscriptions\/[^/]+$/,
  ],
  [
    "sdk.subscriptions.delete",
    () => sdk.subscriptions.delete("r_1"),
    "DELETE",
    /\/events\/subscriptions\/[^/]+$/,
  ],
  [
    "sdk.subscriptions.pause",
    () => sdk.subscriptions.pause("r_1"),
    "POST",
    /\/events\/subscriptions\/[^/]+\/pause$/,
  ],
  [
    "sdk.subscriptions.resume",
    () => sdk.subscriptions.resume("r_1"),
    "POST",
    /\/events\/subscriptions\/[^/]+\/resume$/,
  ],
  ["sdk.schemas.list", () => sdk.schemas.list(), "GET", /\/events\/schemas$/],
  [
    "sdk.schemas.get",
    () => sdk.schemas.get("r_1"),
    "GET",
    /\/events\/schemas\/[^/]+$/,
  ],
  [
    "sdk.schemas.create",
    () => sdk.schemas.create({}, {}),
    "POST",
    /\/events\/schemas$/,
  ],
  [
    "sdk.schemas.update",
    () => sdk.schemas.update("r_1", {}, "r_1"),
    "PUT",
    /\/events\/schemas\/[^/]+$/,
  ],
  [
    "sdk.schemas.validate",
    () => sdk.schemas.validate("r_1", "r_1", {}),
    "POST",
    /\/events\/schemas\/validate$/,
  ],
];

describe("EventsSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});
