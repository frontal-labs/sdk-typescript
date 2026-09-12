import { catchAllRoutes, createTestHttpClient } from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import { AuthSdk } from "../src/sdk";

// Generated endpoint-contract table: every public method must issue the
// expected HTTP method + path. Regenerate with scratchpad/gen-endpoint-tests.py
// when the SDK surface changes.
const { http, mock } = createTestHttpClient(catchAllRoutes());
const sdk = new AuthSdk(http);

const cases: [string, () => Promise<unknown>, string, RegExp][] = [
  [
    "sdk.signUp",
    () => sdk.signUp({ email: "a@b.co", password: "pw" }),
    "POST",
    /\/auth\/signup$/,
  ],
  [
    "sdk.signInWithPassword",
    () => sdk.signInWithPassword({ email: "a@b.co", password: "pw" }),
    "POST",
    /\/auth\/token$/,
  ],
  [
    "sdk.signInWithOAuth",
    () => sdk.signInWithOAuth({ provider: "github" }),
    "POST",
    /\/auth\/authorize$/,
  ],
  [
    "sdk.signInWithOtp",
    () => sdk.signInWithOtp({ email: "a@b.co" }),
    "POST",
    /\/auth\/otp$/,
  ],
  [
    "sdk.signInWithSSO",
    () => sdk.signInWithSSO({ providerId: "p" }),
    "POST",
    /\/auth\/sso$/,
  ],
  [
    "sdk.signInWithIdToken",
    () => sdk.signInWithIdToken({ provider: "google", token: "t" }),
    "POST",
    /\/auth\/token$/,
  ],
  [
    "sdk.signInAnonymously",
    () => sdk.signInAnonymously({}),
    "POST",
    /\/auth\/signup$/,
  ],
  [
    "sdk.verifyOtp",
    () => sdk.verifyOtp({ phone: "+1", token: "t", type: "sms" }),
    "POST",
    /\/auth\/verify$/,
  ],
  [
    "sdk.exchangeCodeForSession",
    () => sdk.exchangeCodeForSession("code"),
    "POST",
    /\/auth\/token$/,
  ],
  ["sdk.getSession", () => sdk.getSession(), "GET", /\/auth\/auth\/session$/],
  ["sdk.getUser", () => sdk.getUser("r_1"), "GET", /\/auth\/user$/],
  ["sdk.updateUser", () => sdk.updateUser({}, {}), "PUT", /\/auth\/user$/],
  [
    "sdk.setSession",
    () => sdk.setSession({}),
    "POST",
    /\/auth\/auth\/session$/,
  ],
  [
    "sdk.refreshSession",
    () => sdk.refreshSession({ refreshToken: "r" }),
    "POST",
    /\/auth\/token$/,
  ],
  ["sdk.signOut", () => sdk.signOut({}), "POST", /\/auth\/logout$/],
  [
    "sdk.resetPasswordForEmail",
    () => sdk.resetPasswordForEmail("r_1", {}),
    "POST",
    /\/auth\/recover$/,
  ],
  [
    "sdk.reauthenticate",
    () => sdk.reauthenticate(),
    "POST",
    /\/auth\/reauthenticate$/,
  ],
  ["sdk.resend", () => sdk.resend({}), "POST", /\/auth\/resend$/],
  [
    "sdk.getUserIdentities",
    () => sdk.getUserIdentities(),
    "GET",
    /\/auth\/user\/identities$/,
  ],
  [
    "sdk.linkIdentity",
    () => sdk.linkIdentity({}),
    "POST",
    /\/auth\/user\/identities$/,
  ],
  [
    "sdk.unlinkIdentity",
    () => sdk.unlinkIdentity({}),
    "DELETE",
    /\/auth\/user\/identities\/[^/]+$/,
  ],
  [
    "sdk.mfa.enroll",
    () => sdk.mfa.enroll({ factorType: "totp" }),
    "POST",
    /\/auth\/factors$/,
  ],
  [
    "sdk.mfa.challenge",
    () => sdk.mfa.challenge({ factorId: "f" }),
    "POST",
    /\/auth\/factors\/[^/]+\/challenge$/,
  ],
  [
    "sdk.mfa.verify",
    () => sdk.mfa.verify({ factorId: "f", challengeId: "c", code: "1" }),
    "POST",
    /\/auth\/factors\/[^/]+\/verify$/,
  ],
  [
    "sdk.mfa.challengeAndVerify",
    () => sdk.mfa.challengeAndVerify({ factorId: "f", code: "1" }),
    "POST",
    /\/auth\/factors\/[^/]+\/verify$/,
  ],
  [
    "sdk.mfa.unenroll",
    () => sdk.mfa.unenroll({ factorId: "f" }),
    "DELETE",
    /\/auth\/factors\/[^/]+$/,
  ],
  [
    "sdk.mfa.listFactors",
    () => sdk.mfa.listFactors(),
    "GET",
    /\/auth\/factors$/,
  ],
  [
    "sdk.admin.mfa.listFactors",
    () => sdk.admin.mfa.listFactors("r_1"),
    "GET",
    /\/auth\/admin\/users\/[^/]+\/factors$/,
  ],
  [
    "sdk.admin.mfa.deleteFactor",
    () => sdk.admin.mfa.deleteFactor("r_1", "r_1"),
    "DELETE",
    /\/auth\/admin\/users\/[^/]+\/factors\/[^/]+$/,
  ],
  [
    "sdk.admin.users.list",
    () => sdk.admin.users.list({}),
    "GET",
    /\/auth\/admin\/users$/,
  ],
  [
    "sdk.admin.users.get",
    () => sdk.admin.users.get("r_1"),
    "GET",
    /\/auth\/admin\/users\/[^/]+$/,
  ],
  [
    "sdk.admin.users.create",
    () => sdk.admin.users.create({}),
    "POST",
    /\/auth\/admin\/users$/,
  ],
  [
    "sdk.admin.users.update",
    () => sdk.admin.users.update("r_1", {}),
    "PUT",
    /\/auth\/admin\/users\/[^/]+$/,
  ],
  [
    "sdk.admin.users.delete",
    () => sdk.admin.users.delete("r_1", true),
    "DELETE",
    /\/auth\/admin\/users\/[^/]+$/,
  ],
  [
    "sdk.admin.users.invite",
    () => sdk.admin.users.invite("r_1", {}, "r_1"),
    "POST",
    /\/auth\/invite$/,
  ],
  [
    "sdk.admin.invite.generateLink",
    () => sdk.admin.invite.generateLink({}),
    "POST",
    /\/auth\/admin\/generate_link$/,
  ],
  [
    "sdk.admin.session.signOut",
    () => sdk.admin.session.signOut("r_1", {}),
    "POST",
    /\/auth\/admin\/logout$/,
  ],
  [
    "sdk.account.getProfile",
    () => sdk.account.getProfile(),
    "GET",
    /\/auth\/account\/profile$/,
  ],
  [
    "sdk.account.updateProfile",
    () => sdk.account.updateProfile({}),
    "PUT",
    /\/auth\/account\/profile$/,
  ],
  [
    "sdk.account.deleteProfile",
    () => sdk.account.deleteProfile(),
    "DELETE",
    /\/auth\/account\/profile$/,
  ],
  [
    "sdk.account.updatePassword",
    () => sdk.account.updatePassword({}),
    "POST",
    /\/auth\/account\/password$/,
  ],
  [
    "sdk.account.getAuditLog",
    () => sdk.account.getAuditLog({}),
    "GET",
    /\/auth\/account\/audit-log$/,
  ],
  [
    "sdk.account.apiKeys.list",
    () => sdk.account.apiKeys.list(),
    "GET",
    /\/auth\/account\/security\/api-keys$/,
  ],
  [
    "sdk.account.apiKeys.create",
    () => sdk.account.apiKeys.create({}),
    "POST",
    /\/auth\/account\/security\/api-keys$/,
  ],
  [
    "sdk.account.apiKeys.get",
    () => sdk.account.apiKeys.get("r_1"),
    "GET",
    /\/auth\/account\/security\/api-keys\/[^/]+$/,
  ],
  [
    "sdk.account.apiKeys.update",
    () => sdk.account.apiKeys.update("r_1", {}),
    "PUT",
    /\/auth\/account\/security\/api-keys\/[^/]+$/,
  ],
  [
    "sdk.account.apiKeys.delete",
    () => sdk.account.apiKeys.delete("r_1"),
    "DELETE",
    /\/auth\/account\/security\/api-keys\/[^/]+$/,
  ],
  [
    "sdk.account.devices.list",
    () => sdk.account.devices.list(),
    "GET",
    /\/auth\/account\/security\/devices$/,
  ],
  [
    "sdk.account.devices.register",
    () => sdk.account.devices.register({}),
    "POST",
    /\/auth\/account\/security\/devices$/,
  ],
  [
    "sdk.account.devices.get",
    () => sdk.account.devices.get("r_1"),
    "GET",
    /\/auth\/account\/security\/devices\/[^/]+$/,
  ],
  [
    "sdk.account.devices.delete",
    () => sdk.account.devices.delete("r_1"),
    "DELETE",
    /\/auth\/account\/security\/devices\/[^/]+$/,
  ],
  [
    "sdk.account.devices.trust",
    () => sdk.account.devices.trust("r_1"),
    "POST",
    /\/auth\/account\/security\/devices\/[^/]+\/trust$/,
  ],
  [
    "sdk.account.sessions.list",
    () => sdk.account.sessions.list(),
    "GET",
    /\/auth\/account\/sessions$/,
  ],
  [
    "sdk.account.sessions.extend",
    () => sdk.account.sessions.extend("r_1"),
    "POST",
    /\/auth\/account\/sessions\/[^/]+\/extend$/,
  ],
  [
    "sdk.account.sessions.revoke",
    () => sdk.account.sessions.revoke("r_1"),
    "DELETE",
    /\/auth\/account\/sessions\/[^/]+$/,
  ],
  [
    "sdk.account.mfa.list",
    () => sdk.account.mfa.list(),
    "GET",
    /\/auth\/account\/mfa$/,
  ],
  [
    "sdk.account.mfa.enroll",
    () => sdk.account.mfa.enroll({}),
    "POST",
    /\/auth\/account\/mfa$/,
  ],
  [
    "sdk.account.mfa.get",
    () => sdk.account.mfa.get("r_1"),
    "GET",
    /\/auth\/account\/mfa\/[^/]+$/,
  ],
  [
    "sdk.account.mfa.unenroll",
    () => sdk.account.mfa.unenroll("r_1"),
    "DELETE",
    /\/auth\/account\/mfa\/[^/]+$/,
  ],
  [
    "sdk.account.mfa.verify",
    () => sdk.account.mfa.verify("r_1", {}),
    "POST",
    /\/auth\/account\/mfa\/[^/]+\/verify$/,
  ],
  [
    "sdk.account.mfa.challenge",
    () => sdk.account.mfa.challenge("r_1"),
    "POST",
    /\/auth\/account\/mfa\/[^/]+\/challenge$/,
  ],
];

describe("AuthSdk endpoints", () => {
  it.each(cases)("%s → %s", async (_label, call, method, path) => {
    mock.reset();
    await call();
    const req = mock.requests.at(-1);
    expect(req?.method).toBe(method);
    expect(req?.path).toMatch(path);
  });
});
