/**
 * Basic Workflow Creation Example
 *
 * This example demonstrates how to create and manage workflows
 * using the Frontal Workflows SDK.
 */

import { workflows } from "../src";

async function basicWorkflowCreation() {
	console.log("[START] Starting Basic Workflow Creation Example\n");

	try {
		// Example 1: Create a simple approval workflow
		console.log("[EXAMPLE] Example 1: Simple approval workflow");
		const approvalWorkflow = await workflows
			.define("document-approval")
			.description("Simple document approval process")
			.version("1.0.0")
			.tags("approval", "documents")
			.manual()
			.task("validate-document", { type: "document", validateSchema: true })
			.approval("manager-approval", ["manager@company.com"], {
				name: "Manager Approval",
				description: "Requires manager approval before proceeding",
				timeout: "24h",
			})
			.task(
				"process-document",
				{ type: "processing", action: "archive" },
				{
					dependsOn: ["manager-approval"],
				},
			)
			.notification("notify-user", "Document has been processed", ["email"], {
				dependsOn: ["process-document"],
			})
			.create();

		console.log("[SUCCESS] Created workflow:", approvalWorkflow.id);
		console.log("[INFO] Workflow status:", approvalWorkflow.status);
		console.log("[INFO] Workflow steps:", approvalWorkflow.steps.length);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Create a scheduled data processing workflow
		console.log("[EXAMPLE] Example 2: Scheduled data processing workflow");
		const dataProcessingWorkflow = await workflows
			.define("data-processing-pipeline")
			.description("Automated data processing pipeline")
			.version("1.0.0")
			.tags("automation", "data", "processing")
			.schedule("0 2 * * *") // Run daily at 2 AM
			.task("extract-data", {
				source: "database",
				query: "SELECT * FROM transactions",
			})
			.task(
				"transform-data",
				{ type: "cleanup", removeNulls: true },
				{
					dependsOn: ["extract-data"],
				},
			)
			.task(
				"load-data",
				{ destination: "warehouse", format: "parquet" },
				{
					dependsOn: ["transform-data"],
				},
			)
			.condition("validate-results", "output.recordCount > 0", {
				dependsOn: ["load-data"],
			})
			.notification(
				"success-notification",
				"Data processing completed successfully",
				["slack", "email"],
				{
					dependsOn: ["validate-results"],
				},
			)
			.activate();

		console.log(
			"[SUCCESS] Created and activated workflow:",
			dataProcessingWorkflow.id,
		);
		console.log("[INFO] Workflow status:", dataProcessingWorkflow.status);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Create a webhook-triggered workflow with parallel steps
		console.log(
			"[EXAMPLE] Example 3: Webhook workflow with parallel processing",
		);
		const webhookWorkflow = await workflows
			.define("webhook-processor")
			.description("Process incoming webhook requests in parallel")
			.version("1.0.0")
			.tags("webhook", "api", "parallel")
			.webhook("https://api.example.com/webhooks/process")
			.task("validate-request", { type: "validation", schema: "v1" })
			.parallel("parallel-processing", ["process-data", "send-notifications"], {
				dependsOn: ["validate-request"],
			})
			.task("process-data", { type: "transformation", format: "json" })
			.task("send-notifications", {
				type: "notification",
				channels: ["email", "sms"],
			})
			.delay("final-delay", "30s", {
				dependsOn: ["parallel-processing"],
			})
			.task(
				"cleanup",
				{ type: "maintenance", action: "temp-cleanup" },
				{
					dependsOn: ["final-delay"],
				},
			)
			.create();

		console.log("[SUCCESS] Created webhook workflow:", webhookWorkflow.id);
		console.log("[INFO] Triggers:", webhookWorkflow.triggers.length);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: List all workflows
		console.log("[EXAMPLE] Example 4: List workflows");
		const workflowList = await workflows.list({ limit: 10 });

		console.log("[SUCCESS] Retrieved workflows:");
		for (const workflow of workflowList.items) {
			console.log(
				`  - ${workflow.name} (${workflow.id}) - Status: ${workflow.status}`,
			);
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Get workflow details and trigger execution
		console.log("[EXAMPLE] Example 5: Trigger workflow execution");
		const workflowAccessor = workflows.workflow(approvalWorkflow.id);
		const workflowDetails = await workflowAccessor.get();

		console.log("[INFO] Workflow details:", workflowDetails.name);

		// Trigger the workflow with input data
		const execution = await workflowAccessor.trigger({
			documentId: "doc-123",
			documentType: "invoice",
			amount: 1500.0,
		});

		console.log("[SUCCESS] Triggered execution:", execution.id);
		console.log("[INFO] Execution status:", execution.status);
	} catch (error) {
		console.error("[ERROR] Unexpected error:", error);
	}
}

// Run the example
if (import.meta.main) {
	basicWorkflowCreation();
}

export { basicWorkflowCreation };
