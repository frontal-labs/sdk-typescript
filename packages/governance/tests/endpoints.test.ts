import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { GovernanceSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new GovernanceSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  ["sdk.policies.list", () => sdk.policies.list({}), "GET", /\/policies$/],
  [
    "sdk.policies.create",
    () => sdk.policies.create({}, {}),
    "POST",
    /\/policies$/,
  ],
  [
    "sdk.policies.get",
    () => sdk.policies.get("r_1"),
    "GET",
    /\/policies\/[^/]+$/,
  ],
  [
    "sdk.policies.update",
    () => sdk.policies.update("r_1", {}),
    "PUT",
    /\/policies\/[^/]+$/,
  ],
  [
    "sdk.policies.delete",
    () => sdk.policies.delete("r_1"),
    "DELETE",
    /\/policies\/[^/]+$/,
  ],
  [
    "sdk.policies.versions",
    () => sdk.policies.versions("r_1"),
    "GET",
    /\/policies\/[^/]+\/versions$/,
  ],
  [
    "sdk.policies.templates",
    () => sdk.policies.templates({}),
    "GET",
    /\/policies\/templates$/,
  ],
  [
    "sdk.policies.fromTemplate",
    () => sdk.policies.fromTemplate({}),
    "POST",
    /\/policies\/from-template$/,
  ],
  [
    "sdk.policies.validate",
    () => sdk.policies.validate({}),
    "POST",
    /\/policies\/validate$/,
  ],
  [
    "sdk.compliance.frameworks",
    () => sdk.compliance.frameworks(),
    "GET",
    /\/compliance\/frameworks$/,
  ],
  [
    "sdk.compliance.runAssessment",
    () => sdk.compliance.runAssessment({}),
    "POST",
    /\/compliance\/assessments$/,
  ],
  [
    "sdk.compliance.listAssessments",
    () => sdk.compliance.listAssessments({}),
    "GET",
    /\/compliance\/assessments$/,
  ],
  [
    "sdk.compliance.getAssessment",
    () => sdk.compliance.getAssessment("r_1"),
    "GET",
    /\/compliance\/assessments\/[^/]+$/,
  ],
  [
    "sdk.compliance.listViolations",
    () => sdk.compliance.listViolations({}),
    "GET",
    /\/compliance\/violations$/,
  ],
  [
    "sdk.compliance.resolveViolation",
    () => sdk.compliance.resolveViolation("r_1", {}),
    "POST",
    /\/compliance\/violations\/[^/]+\/resolve$/,
  ],
  [
    "sdk.compliance.score",
    () => sdk.compliance.score({}),
    "GET",
    /\/compliance\/score$/,
  ],
  ["sdk.roles.list", () => sdk.roles.list({}), "GET", /\/roles$/],
  ["sdk.roles.get", () => sdk.roles.get("r_1"), "GET", /\/roles\/[^/]+$/],
  ["sdk.roles.create", () => sdk.roles.create(["a"]), "POST", /\/roles$/],
  [
    "sdk.roles.delete",
    () => sdk.roles.delete("r_1"),
    "DELETE",
    /\/roles\/[^/]+$/,
  ],
  [
    "sdk.permissions.list",
    () => sdk.permissions.list({}),
    "GET",
    /\/permissions$/,
  ],
  [
    "sdk.permissions.get",
    () => sdk.permissions.get("r_1"),
    "GET",
    /\/permissions\/[^/]+$/,
  ],
  [
    "sdk.permissions.create",
    () => sdk.permissions.create({}),
    "POST",
    /\/permissions$/,
  ],
  [
    "sdk.access.check",
    () => sdk.access.check(["a"]),
    "POST",
    /\/access\/check$/,
  ],
];

describe("GovernanceSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});
