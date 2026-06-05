/**
 * MFA enrollment/verification and OAuth sign-in flows.
 */
import { createAuthClient } from "@frontal-labs/auth";

const auth = createAuthClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function mfaEnrollment() {
  console.log("🔐 Enrolling TOTP MFA factor...");

  const enroll = await auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Auth app",
    issuer: "Frontal",
  });

  if (!enroll.error && enroll.data && "totp" in enroll.data) {
    console.log("✅ TOTP enrolled");
    console.log("   Secret:", (enroll.data as Record<string, unknown>).totp
      ? (enroll.data as unknown as { totp: { secret: string } }).totp.secret
      : "N/A");

    // Verify the factor
    console.log("\n🔍 Verifying TOTP...");
    const challenge = await auth.mfa.challenge({ factorId: enroll.data.id });
    console.log("   Challenge ID:", challenge.data?.id);

    // In a real app you'd get the code from the user's authenticator app
    // const verify = await auth.mfa.verify({
    //   factorId: enroll.data.id,
    //   challengeId: challenge.data!.id,
    //   code: "123456",
    // });
    console.log("✅ MFA flow complete (code input skipped in example)");
  }
}

async function oAuthSignIn() {
  console.log("\n🌐 OAuth sign-in with GitHub...");

  const result = await auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: "https://myapp.com/auth/callback",
      scopes: "user:email",
    },
  });

  if (result.data?.url) {
    console.log("✅ Redirect user to:", result.data.url);
  }
}

async function ssoSignIn() {
  console.log("\n🏢 SSO sign-in (enterprise)...");

  const result = await auth.signInWithSSO({ domain: "mycompany.com" });
  if (result.data?.url) {
    console.log("✅ SSO redirect:", result.data.url);
  }
}

async function main() {
  try {
    await mfaEnrollment();
    await oAuthSignIn();
    await ssoSignIn();
    console.log("\n🎉 MFA & OAuth examples complete!");
  } catch (e) {
    console.error("❌", e);
  }
}

main();
