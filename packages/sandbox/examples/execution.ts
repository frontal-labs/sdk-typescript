/**
 * Sandbox creation, code execution, output streaming, and file management.
 */
import { createSandboxClient } from "@frontal-labs/sandbox";

const sandbox = createSandboxClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("📦 Available sandbox templates...");
  const templates = await sandbox.templates.list();
  for (const t of templates.data) {
    console.log(`   - ${t.name}: ${t.image}`);
  }

  const templateId = templates.data[0]?.id ?? "tmpl_python";
  console.log(`\n🏗️  Creating sandbox with template ${templateId}...`);
  const sbx = await sandbox.sandboxes.create({
    name: "data-processing",
    template_id: templateId,
    cpu_limit: "2",
    memory_limit: "1Gi",
    timeout_seconds: 300,
  });
  console.log(`✅ Sandbox: ${sbx.id} [${sbx.status}]`);

  console.log("\n▶️  Starting sandbox...");
  const started = await sandbox.sandboxes.start(sbx.id);
  console.log(`✅ Status: ${started.status}`);

  console.log("\n⚡ Executing code...");
  const exec = await sandbox.executions.execute(sbx.id, {
    code: 'import json\nprint(json.dumps({"processed": True, "records": 42}))',
    language: "python",
  });
  console.log(`✅ Execution: ${exec.status} (${exec.duration_ms}ms)`);

  console.log("\n📁 Uploading file...");
  await sandbox.files.upload(sbx.id, "/workspace/input.csv", "col1,col2\n1,2");
  console.log("✅ File uploaded");

  const files = await sandbox.files.list(sbx.id);
  console.log(`   ${files.data.length} file(s) in workspace`);

  console.log("\n📸 Creating snapshot...");
  const snap = await sandbox.sandboxes.snapshot(sbx.id);
  console.log(`✅ Snapshot: ${snap.id}`);

  await sandbox.sandboxes.stop(sbx.id);
  console.log("⏹️  Sandbox stopped");
  await sandbox.sandboxes.delete(sbx.id);
  console.log("\n🎉 Complete!");
}

main();
