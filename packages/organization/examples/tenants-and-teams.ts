/**
 * Organization, tenant, and team management.
 */
import { createOrganizationClient } from "@frontal-labs/organization";

const org = createOrganizationClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🏢 Fetching organization...");
  const orgData = await org.get();
  console.log(`✅ ${orgData.name} (${orgData.plan} plan)`);

  console.log("\n📂 Managing tenants...");
  const tenant = await org.tenants.create({
    name: "Engineering",
    slug: "engineering",
    description: "Engineering department tenant",
  });
  console.log("✅ Tenant created:", tenant.slug);

  const allTenants = await org.tenants.list();
  console.log(`   Listed ${allTenants.data.length} tenant(s)`);

  console.log("\n👥 Managing teams...");
  const team = await org.teams.create({
    name: "Platform",
    description: "Platform engineering team",
    tenant_id: tenant.id,
  });
  console.log("✅ Team created:", team.name);

  const teams = await org.teams.list({ tenant_id: tenant.id });
  console.log(`   ${teams.data.length} team(s) in ${tenant.slug}`);

  const members = await org.members.list();
  if (members.data.length > 0) {
    await org.teams.addMember(team.id, members.data[0].id);
    console.log("✅ Added member to team");
  }

  await org.teams.delete(team.id);
  await org.tenants.delete(tenant.id);
  console.log("\n🎉 Complete!");
}

main();
