/**
 * Sign-up, sign-in, and session management using the Frontal Auth SDK.
 * Auth wraps GoTrue's API under api.frontal.dev/v1.
 */
import { createAuthClient } from "@frontal-labs/auth";

const auth = createAuthClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function signUpAndSignIn() {
  // ── Sign up ──────────────────────────────────────────────────
  console.log("📝 Signing up...");
  const signUpResult = await auth.signUp({
    email: "dev@example.com",
    password: "super-secret-123",
  });
  if (signUpResult.error) {
    console.error("Sign-up failed:", signUpResult.error.message);
    return;
  }
  console.log("✅ User created:", signUpResult.data.user?.email);

  // ── Sign in with password ────────────────────────────────────
  console.log("\n🔑 Signing in...");
  const signInResult = await auth.signInWithPassword({
    email: "dev@example.com",
    password: "super-secret-123",
  });
  if (signInResult.error) {
    console.error("Sign-in failed:", signInResult.error.message);
    return;
  }
  const session = signInResult.data.session;
  console.log("✅ Signed in, access token:", session?.access_token.slice(0, 20) + "...");
  console.log("   Expires in:", session?.expires_in, "seconds");
}

async function sessionManagement() {
  console.log("\n📋 Session management...");

  // Get current session
  const { data: { session } } = await auth.getSession();
  if (session) {
    console.log("✅ Active session for:", session.user.email);
  }

  // Refresh the session
  const refreshed = await auth.refreshSession({
    refresh_token: session!.refresh_token,
  });
  if (!refreshed.error) {
    console.log("✅ Session refreshed, new expiry:", refreshed.data.session?.expires_in, "s");
  }

  // Sign out
  await auth.signOut();
  console.log("👋 Signed out");
}

async function main() {
  try {
    await signUpAndSignIn();
    await sessionManagement();
    console.log("\n🎉 Auth examples complete!");
  } catch (e) {
    console.error("❌", e);
  }
}

main();
