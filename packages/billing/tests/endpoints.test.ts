import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { BillingSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new BillingSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "sdk.customers.entitlements",
    () => sdk.customers.entitlements("r_1"),
    "GET",
    /\/billing\/customers\/[^/]+\/entitlements$/,
  ],
  [
    "sdk.customers.usage",
    () => sdk.customers.usage("r_1"),
    "GET",
    /\/billing\/customers\/[^/]+\/usage$/,
  ],
  [
    "sdk.customers.wallets",
    () => sdk.customers.wallets("r_1"),
    "GET",
    /\/billing\/customers\/[^/]+\/wallets$/,
  ],
  [
    "sdk.customers.invoiceSummary",
    () => sdk.customers.invoiceSummary("r_1"),
    "GET",
    /\/billing\/customers\/[^/]+\/invoices\/summary$/,
  ],
  [
    "sdk.customers.portalSession",
    () => sdk.customers.portalSession("r_1"),
    "GET",
    /\/billing\/customers\/portal\/[^/]+$/,
  ],
  [
    "sdk.plans.clone",
    () => sdk.plans.clone("r_1", {}),
    "POST",
    /\/billing\/plans\/[^/]+\/clone$/,
  ],
  [
    "sdk.plans.entitlements",
    () => sdk.plans.entitlements("r_1"),
    "GET",
    /\/billing\/plans\/[^/]+\/entitlements$/,
  ],
  [
    "sdk.subscriptions.activate",
    () => sdk.subscriptions.activate("r_1"),
    "POST",
    /\/billing\/subscriptions\/[^/]+\/activate$/,
  ],
  [
    "sdk.subscriptions.cancel",
    () => sdk.subscriptions.cancel("r_1", {}),
    "POST",
    /\/billing\/subscriptions\/[^/]+\/cancel$/,
  ],
  [
    "sdk.subscriptions.pause",
    () => sdk.subscriptions.pause("r_1", {}),
    "POST",
    /\/billing\/subscriptions\/[^/]+\/pause$/,
  ],
  [
    "sdk.subscriptions.resume",
    () => sdk.subscriptions.resume("r_1", {}),
    "POST",
    /\/billing\/subscriptions\/[^/]+\/resume$/,
  ],
  [
    "sdk.subscriptions.entitlements",
    () => sdk.subscriptions.entitlements("r_1"),
    "GET",
    /\/billing\/subscriptions\/[^/]+\/entitlements$/,
  ],
  [
    "sdk.invoices.finalize",
    () => sdk.invoices.finalize("r_1"),
    "POST",
    /\/billing\/invoices\/[^/]+\/finalize$/,
  ],
  [
    "sdk.invoices.void",
    () => sdk.invoices.void("r_1"),
    "POST",
    /\/billing\/invoices\/[^/]+\/void$/,
  ],
  [
    "sdk.invoices.preview",
    () => sdk.invoices.preview({}),
    "POST",
    /\/billing\/invoices\/preview$/,
  ],
  [
    "sdk.invoices.pdf",
    () => sdk.invoices.pdf("r_1"),
    "GET",
    /\/billing\/invoices\/[^/]+\/pdf$/,
  ],
  [
    "sdk.wallets.transactions",
    () => sdk.wallets.transactions("r_1", {}),
    "GET",
    /\/billing\/wallets\/[^/]+\/transactions$/,
  ],
  [
    "sdk.wallets.topUp",
    () => sdk.wallets.topUp("r_1", {}),
    "POST",
    /\/billing\/wallets\/[^/]+\/top-up$/,
  ],
  [
    "sdk.wallets.terminate",
    () => sdk.wallets.terminate("r_1"),
    "POST",
    /\/billing\/wallets\/[^/]+\/terminate$/,
  ],
  [
    "sdk.wallets.realTimeBalance",
    () => sdk.wallets.realTimeBalance("r_1"),
    "GET",
    /\/billing\/wallets\/[^/]+\/balance\/real-time$/,
  ],
  [
    "sdk.meters.disable",
    () => sdk.meters.disable("r_1"),
    "POST",
    /\/billing\/meters\/[^/]+\/disable$/,
  ],
  [
    "sdk.prices.lookup",
    () => sdk.prices.lookup("r_1"),
    "GET",
    /\/billing\/prices\/lookup\/[^/]+$/,
  ],
  [
    "sdk.addons.entitlements",
    () => sdk.addons.entitlements("r_1"),
    "GET",
    /\/billing\/addons\/[^/]+\/entitlements$/,
  ],
];

describe("BillingSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});
