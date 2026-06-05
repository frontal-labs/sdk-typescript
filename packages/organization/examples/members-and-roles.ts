/**
 * Member invitation, role assignment, and RBAC.
 */
import { createOrganizationClient } from "@frontal-labs/organization";

const org = createOrganizationClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("✉️ Inviting members...");
  const invitation = await org.invitations.create({
    email: "designer@example.com",
    role: "member",
  });
  console.log(`✅ Invitation sent to ${invitation.email}, status: ${invitation.status}`);

  const pending = await org.invitations.list({ status: "pending" });
  console.log(`   ${pending.data.length} pending invitation(s)`);

  console.log("\n🔑 Managing roles...");
  const role = await org.roles.create({
    name: "Pipeline Operator",
    description: "Can trigger and manage pipelines",
    permissions: [
      { resource: "pipelines", action: "read" },
      { resource: "pipelines", action: "update" },
      { resource: "pipelines.runs", action: "create" },
    ],
  });
  console.log(`✅ Role created: ${role.name} with ${role.permissions.length} permission(s)`);

  const members = await org.members.list({ role: "member" });
  for await (const m of members) {
    console.log(`   - ${m.name} <${m.email}> — ${m.role}`);
  }

  if (members.data.length > 0) {
    const updated = await org.members.updateRole(members.data[0].id, "admin");
    console.log(`✅ Updated ${updated.name} to ${updated.role}`);
  }

  await org.roles.delete(role.id);
  await org.invitations.cancel(invitation.id);
  console.log("\n🎉 Complete!");
}

main();
