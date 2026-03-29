/**
 * Approval Management Example
 *
 * This example demonstrates how to work with workflow approvals,
 * including creating approval steps, managing approval requests,
 * and handling approval decisions.
 */

import { workflows } from "../src";

async function approvalManagementExample() {
	console.log("[START] Starting Approval Management Example\n");

	try {
		// Example 1: Create a multi-step approval workflow
		console.log("[EXAMPLE] Example 1: Multi-step approval workflow");
		const multiApprovalWorkflow = await workflows
			.define("expense-approval")
			.description("Multi-level expense approval process")
			.version("1.0.0")
			.tags("approval", "finance", "expenses")
			.manual()
			.task("validate-expense", {
				type: "validation",
				rules: ["amount > 0", "receipt_required"],
			})
			.approval("manager-approval", ["manager@company.com"], {
				name: "Manager Approval",
				description: "Manager must approve expenses over $100",
				timeout: "48h",
			})
			.condition("check-amount", "input.amount > 1000", {
				dependsOn: ["manager-approval"],
			})
			.approval("director-approval", ["director@company.com"], {
				name: "Director Approval",
				description: "Director approval required for expenses over $1000",
				timeout: "72h",
				dependsOn: ["check-amount"],
			})
			.task(
				"process-payment",
				{
					type: "payment",
					method: "ach",
					condition: "approvals.completed == true",
				},
				{
					dependsOn: ["manager-approval", "director-approval"],
				},
			)
			.notification(
				"notify-employee",
				"Your expense has been processed",
				["email"],
				{
					dependsOn: ["process-payment"],
				},
			)
			.create();

		console.log(
			"[SUCCESS] Created multi-approval workflow:",
			multiApprovalWorkflow.id,
		);

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Trigger workflow and wait for approvals
		console.log("[EXAMPLE] Example 2: Trigger workflow and manage approvals");
		const workflowAccessor = workflows.workflow(multiApprovalWorkflow.id);

		const execution = await workflowAccessor.trigger({
			employeeId: "emp-456",
			amount: 1500.0,
			description: "Conference travel expenses",
			category: "travel",
			receiptUrl: "https://storage.example.com/receipts/abc123.pdf",
		});

		console.log("[SUCCESS] Triggered execution:", execution.id);
		console.log("[INFO] Execution status:", execution.status);

		// Get the execution details to see the approval steps
		const executionDetails = await workflowAccessor.execution(execution.id);
		console.log(
			"[INFO] Step executions:",
			executionDetails.stepExecutions.length,
		);

		// Find approval steps
		const approvalSteps = executionDetails.stepExecutions.filter(
			(step) => step.status === "pending" && step.stepId.includes("approval"),
		);

		console.log("[INFO] Pending approvals:", approvalSteps.length);

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: List and manage pending approvals
		console.log("[EXAMPLE] Example 3: Manage pending approvals");
		const pendingApprovals = await workflows.approvals.list({
			status: "pending",
			limit: 10,
		});

		console.log("[SUCCESS] Retrieved pending approvals:");
		for (const approval of pendingApprovals.items) {
			console.log(
				`  - Approval ${approval.id} for workflow ${approval.workflowId}`,
			);
			console.log(`    Status: ${approval.status}`);
			console.log(`    Requested by: ${approval.requestedBy}`);
			console.log(`    Required approvals: ${approval.requiredApprovals}`);
			console.log(`    Approvers: ${approval.approvers.length}`);
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 4: Simulate approval process
		if (pendingApprovals.items.length > 0) {
			console.log("[EXAMPLE] Example 4: Process an approval");
			const firstApproval = pendingApprovals.items[0];

			// Get detailed approval information
			const approvalDetails = await workflows.approvals.get(firstApproval.id);
			console.log("[INFO] Approval details:", approvalDetails.id);

			// Simulate manager approval
			const approvedApproval = await workflows.approvals.approve(
				firstApproval.id,
				"Expense looks reasonable. Approved for processing.",
			);

			console.log("[SUCCESS] Approved request:", approvedApproval.id);
			console.log("[INFO] New status:", approvedApproval.status);

			// Show approver responses
			for (const approver of approvedApproval.approvers) {
				console.log(`  - ${approver.userId}: ${approver.status}`);
				if (approver.comment) {
					console.log(`    Comment: ${approver.comment}`);
				}
			}
		}

		console.log("\n" + "=".repeat(50) + "\n");

		// Example 5: Create a conditional approval workflow
		console.log("[EXAMPLE] Example 5: Conditional approval workflow");
		const conditionalWorkflow = await workflows
			.define("conditional-approval")
			.description("Conditional approval based on risk assessment")
			.version("1.0.0")
			.tags("approval", "conditional", "risk")
			.manual()
			.task("risk-assessment", {
				type: "assessment",
				model: "risk-v2",
				factors: ["amount", "category", "user_history"],
			})
			.condition("high-risk", "output.riskScore > 0.7", {
				dependsOn: ["risk-assessment"],
			})
			.approval("high-risk-approval", ["risk-team@company.com"], {
				name: "High Risk Approval",
				description: "Additional approval for high-risk transactions",
				dependsOn: ["high-risk"],
			})
			.condition(
				"medium-risk",
				"output.riskScore > 0.4 && output.riskScore <= 0.7",
				{
					dependsOn: ["risk-assessment"],
				},
			)
			.approval("standard-approval", ["supervisor@company.com"], {
				name: "Standard Approval",
				description: "Standard supervisor approval",
				dependsOn: ["medium-risk"],
			})
			.task(
				"auto-approve",
				{
					type: "auto-approval",
					condition: "output.riskScore <= 0.4",
				},
				{
					dependsOn: ["risk-assessment"],
				},
			)
			.task(
				"process-transaction",
				{
					type: "processing",
					condition:
						"approvals.completed == true || auto_approve.completed == true",
				},
				{
					dependsOn: [
						"high-risk-approval",
						"standard-approval",
						"auto-approve",
					],
				},
			)
			.create();

		console.log(
			"[SUCCESS] Created conditional approval workflow:",
			conditionalWorkflow.id,
		);

		// Trigger with different risk levels
		const lowRiskExecution = await workflows
			.workflow(conditionalWorkflow.id)
			.trigger({
				amount: 50.0,
				category: "office-supplies",
				userId: "user-123",
			});

		console.log("[SUCCESS] Triggered low-risk execution:", lowRiskExecution.id);
	} catch (error) {
		console.error("[ERROR] Unexpected error:", error);
	}
}

// Run the example
if (import.meta.main) {
	approvalManagementExample();
}

export { approvalManagementExample };
