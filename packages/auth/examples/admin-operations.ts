/**
 * Admin operations (service_role key required — server-side only).
 * Create, list, update, and delete users. Invite by email. Generate links.
 */
import { createAuthClient } from "@frontal-labs/auth";

// Admin operations require a service_role key
const auth = createAuthClient({
  apiKey: process.env.FRONTAL_SERVICE_ROLE_KEY!,
});

async function userManagement() {
  console.log("👥 Admin user management...");

  // Create a user
  const created = await auth.admin.createUser({
    email: "new-dev@example.com",
    password: "temp-password-123",
    email_confirm: true,
    user_metadata: { department: "engineering" },
  });
  if (created.error) {
    console.error("Create failed:", created.error.message);
  } else {
    console.log("✅ User created:", created.data.user?.id);
  }

  // List users (paginated)
  const list = await auth.admin.listUsers({ page: 1, perPage: 20 });
  if (list.data) {
    console.log(`✅ Listed ${list.data.users.length} users`);
  }

  // Get user by ID
  if (created.data?.user) {
    const user = await auth.admin.getUserById(created.data.user.id);
    console.log("✅ User details:", user.data.user?.email);
  }

  // Invite user by email
  const invite = await auth.admin.inviteUserByEmail("colleague@example.com", {
    redirectTo: "https://myapp.com/welcome",
  });
  console.log("✅ Invitation sent:", invite.data.user?.email);

  // Generate a magic link
  const link = await auth.admin.generateLink({
    type: "magiclink",
    email: "colleague@example.com",
  });
  console.log("✅ Magic link generated");
}

async function main() {
  try {
    await userManagement();
    console.log("\n🎉 Admin examples complete!");
  } catch (e) {
    console.error("❌", e);
  }
}

main();
