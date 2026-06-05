/**
 * Alert rules, incidents, and dashboard management.
 */
import { createObservabilityClient } from "@frontal-labs/observability";

const obs = createObservabilityClient({ apiKey: process.env.FRONTAL_API_KEY! });

async function main() {
  console.log("🚨 Creating alert rule...");
  const alert = await obs.alerts.create({
    name: "High Error Rate",
    metric: "http_errors",
    condition: ">=" as const,
    threshold: 0.05,
    severity: "critical" as const,
    duration: "5m",
    channels: ["email", "slack"],
    enabled: true,
  });
  console.log(`✅ Alert created: ${alert.name}`);

  console.log("\n🔍 Checking incidents...");
  const incidents = await obs.alerts.listIncidents({ status: "firing" });
  console.log(`   ${incidents.data.length} firing incident(s)`);

  await obs.alerts.disable(alert.id);
  console.log("✅ Alert disabled");

  console.log("\n📊 Creating dashboard...");
  const dash = await obs.dashboards.create({
    name: "API Overview",
    description: "Key API metrics",
    widgets: [
      { id: "w1", type: "line", title: "Request Rate", metric: "http_requests", width: 12, height: 3 },
      { id: "w2", type: "stat", title: "P99 Latency", metric: "http_latency_p99", width: 6, height: 2 },
    ],
  });
  console.log(`✅ Dashboard created: ${dash.name}`);

  const shared = await obs.dashboards.share(dash.id, { expires_in: "24h" });
  console.log(`✅ Shared: ${shared.share_url}`);

  await obs.alerts.delete(alert.id);
  await obs.dashboards.delete(dash.id);
  console.log("\n🎉 Complete!");
}

main();
