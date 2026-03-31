/**
 * Workflow Templates Example
 *
 * This example demonstrates how to create, use, and manage workflow templates.
 * Templates provide reusable workflow patterns that can be customized for different use cases.
 */

import { workflows } from "../src";

async function workflowTemplatesExample() {
	console.log("[START] Starting Workflow Templates Example\n");

	try {
		// Example 1: Create a basic approval template
		console.log("[EXAMPLE] Example 1: Create approval template");
		const approvalTemplate = await workflows.templates.create({
			name: "Basic Approval Template",
			description: "A simple two-step approval workflow template",
			category: "approval",
			definition: {
				name: "basic-approval-template",
				description: "Template for basic approval processes",
				triggers: [{ type: "manual" }],
				steps: [
					{
						id: "initial-validation",
						type: "task",
						name: "Initial Validation",
						config: { type: "validation", autoApprove: false },
					},
					{
						id: "manager-approval",
						type: "approval",
						name: "Manager Approval",
						config: { approvers: ["{{manager_email}}"] },
						dependsOn: ["initial-validation"],
						timeout: "24h",
					},
					{
						id: "final-processing",
						type: "task",
						name: "Final Processing",
						config: { type: "processing", action: "{{processing_action}}" },
						dependsOn: ["manager-approval"],
					},
				],
				variables: {
					manager_email: "manager@example.com",
					processing_action: "archive",
				},
				tags: ["template", "approval", "basic"],
			},
		});

		console.log("[SUCCESS] Created approval template:", approvalTemplate.id);
		console.log("[INFO] Template category:", approvalTemplate.category);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Create a data processing template
		console.log("[EXAMPLE] Example 2: Create data processing template");
		const dataProcessingTemplate = await workflows.templates.create({
			name: "ETL Pipeline Template",
			description: "Extract, Transform, Load pipeline template with scheduling",
			category: "data-processing",
			definition: {
				name: "etl-pipeline-template",
				description: "Template for ETL workflows",
				triggers: [
					{
						type: "schedule",
						schedule: "{{schedule_cron}}",
					},
				],
				steps: [
					{
						id: "extract",
						type: "task",
						name: "Extract Data",
						config: {
							type: "extract",
							source: "{{data_source}}",
							query: "{{extract_query}}",
						},
					},
					{
						id: "transform",
						type: "task",
						name: "Transform Data",
						config: {
							type: "transform",
							operations: "{{transform_operations}}",
						},
						dependsOn: ["extract"],
					},
					{
						id: "validate",
						type: "condition",
						name: "Validate Results",
						config: {
							expression: "{{validation_expression}}",
						},
						condition: "{{validation_expression}}",
						dependsOn: ["transform"],
					},
					{
						id: "load",
						type: "task",
						name: "Load Data",
						config: {
							type: "load",
							destination: "{{destination}}",
							format: "{{output_format}}",
						},
						dependsOn: ["validate"],
					},
					{
						id: "notify",
						type: "notification",
						name: "Send Notification",
						config: {
							message: "ETL pipeline completed successfully",
							channels: "{{notification_channels}}",
						},
						dependsOn: ["load"],
					},
				],
				variables: {
					schedule_cron: "0 2 * * *",
					data_source: "database",
					extract_query: "SELECT * FROM source_table",
					transform_operations: ["cleanup", "normalize", "enrich"],
					validation_expression: "output.recordCount > 0",
					destination: "data_warehouse",
					output_format: "parquet",
					notification_channels: ["email", "slack"],
				},
				tags: ["template", "etl", "data", "automation"],
			},
		});

		console.log("[SUCCESS] Created ETL template:", dataProcessingTemplate.id);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: List available templates
		console.log("[EXAMPLE] Example 3: List workflow templates");
		const templatesList = await workflows.templates.list({ limit: 10 });

		console.log("[SUCCESS] Available templates:");
		for (const template of templatesList.items) {
			console.log(`  - ${template.name} (${template.id})`);
			console.log(`    Category: ${template.category}`);
			console.log(`    Description: ${template.description}`);
			if (template.usage) {
				console.log(`    Used ${template.usage.count} times`);
				if (template.usage.lastUsed) {
					console.log(`    Last used: ${template.usage.lastUsed}`);
				}
			}
			console.log(`    Tags: ${template.tags.join(", ")}`);
			console.log("");
		}

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Use a template to create a workflow
		console.log("[EXAMPLE] Example 4: Create workflow from template");

		// Use the approval template to create a specific workflow
		const expenseApprovalWorkflow = await workflows.templates.use(
			approvalTemplate.id,
			"expense-approval-workflow",
		);

		console.log(
			"[SUCCESS] Created workflow from template:",
			expenseApprovalWorkflow.id,
		);
		console.log("[INFO] Workflow name:", expenseApprovalWorkflow.name);
		console.log("[INFO] Workflow steps:", expenseApprovalWorkflow.steps.length);

		// Customize the workflow with specific approvers
		const customizedWorkflow = await workflows
			.workflow(expenseApprovalWorkflow.id)
			.update({
				steps: expenseApprovalWorkflow.steps.map((step) => {
					if (step.id === "manager-approval") {
						return {
							...step,
							config: {
								approvers: [
									"finance-manager@company.com",
									"director@company.com",
								],
							},
						};
					}
					return step;
				}),
			});

		console.log("[SUCCESS] Customized workflow:", customizedWorkflow.id);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Create a complex multi-category template
		console.log(
			"[EXAMPLE] Example 5: Create complex incident response template",
		);
		const incidentResponseTemplate = await workflows.templates.create({
			name: "Incident Response Template",
			description:
				"Comprehensive incident response workflow with multiple approval levels",
			category: "incident-management",
			definition: {
				name: "incident-response-template",
				description: "Template for incident response processes",
				triggers: [
					{ type: "event", eventType: "incident.created" },
					{ type: "webhook", webhookUrl: "{{webhook_endpoint}}" },
				],
				steps: [
					{
						id: "assess-severity",
						type: "task",
						name: "Assess Incident Severity",
						config: {
							type: "assessment",
							criteria: "{{severity_criteria}}",
						},
					},
					{
						id: "notify-team",
						type: "notification",
						name: "Notify Response Team",
						config: {
							message: "Incident {{incident_id}} requires attention",
							channels: "{{notification_channels}}",
						},
						dependsOn: ["assess-severity"],
					},
					{
						id: "check-criticality",
						type: "condition",
						name: "Check if Critical",
						config: {
							expression: "{{severity_expression}}",
						},
						condition: "{{severity_expression}}",
						dependsOn: ["assess-severity"],
					},
					{
						id: "executive-approval",
						type: "approval",
						name: "Executive Approval",
						config: { approvers: "{{executive_approvers}}" },
						dependsOn: ["check-criticality"],
						timeout: "1h",
					},
					{
						id: "technical-response",
						type: "task",
						name: "Technical Response",
						config: {
							type: "technical",
							procedures: "{{response_procedures}}",
						},
						dependsOn: ["notify-team"],
					},
					{
						id: "customer-communication",
						type: "task",
						name: "Customer Communication",
						config: {
							type: "communication",
							template: "{{communication_template}}",
						},
						dependsOn: ["technical-response"],
					},
					{
						id: "post-mortem",
						type: "task",
						name: "Post-Mortem Analysis",
						config: {
							type: "analysis",
							timeframe: "{{post_mortem_timeframe}}",
						},
						dependsOn: ["executive-approval", "technical-response"],
					},
				],
				variables: {
					webhook_endpoint: "https://api.company.com/webhooks/incidents",
					severity_criteria: ["impact", "urgency", "affected_users"],
					notification_channels: ["slack", "email", "pagerduty"],
					severity_expression: "output.severityLevel >= 4",
					executive_approvers: [
						"cto@company.com",
						"vp-engineering@company.com",
					],
					response_procedures: ["isolate", "mitigate", "recover"],
					communication_template: "incident-update",
					post_mortem_timeframe: "72h",
				},
				tags: ["template", "incident", "response", "critical", "approval"],
			},
		});

		console.log(
			"[SUCCESS] Created incident response template:",
			incidentResponseTemplate.id,
		);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 6: Get template details and usage statistics
		console.log("[EXAMPLE] Example 6: Get template details");
		const templateDetails = await workflows.templates.get(approvalTemplate.id);

		console.log("[INFO] Template details:");
		console.log(`  Name: ${templateDetails.name}`);
		console.log(`  Category: ${templateDetails.category}`);
		console.log(`  Created: ${templateDetails.createdAt}`);
		console.log(`  Updated: ${templateDetails.updatedAt}`);
		console.log(`  Steps: ${templateDetails.definition.steps.length}`);
		console.log(
			`  Variables: ${Object.keys(templateDetails.definition.variables || {}).length}`,
		);

		if (templateDetails.usage) {
			console.log(`  Usage count: ${templateDetails.usage.count}`);
			if (templateDetails.usage.lastUsed) {
				console.log(`  Last used: ${templateDetails.usage.lastUsed}`);
			}
		}
	} catch (error) {
		console.error("[ERROR] Unexpected error:", error);
	}
}

// Run the example
if (import.meta.main) {
	workflowTemplatesExample();
}

export { workflowTemplatesExample };
