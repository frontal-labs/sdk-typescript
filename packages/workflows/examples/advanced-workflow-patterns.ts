/**
 * Advanced Workflow Patterns Example
 *
 * This example demonstrates advanced workflow patterns including:
 * - Parallel execution with synchronization
 * - Complex conditional logic
 * - Error handling and retries
 * - Dynamic workflow modification
 */

import { workflows } from "../src";

async function advancedWorkflowPatterns() {
	console.log("[START] Starting Advanced Workflow Patterns Example\n");

	try {
		// Example 1: Complex parallel processing with synchronization
		console.log(
			"[EXAMPLE] Example 1: Parallel processing with synchronization",
		);
		const parallelWorkflow = await workflows
			.define("parallel-data-processing")
			.description("Process data in parallel and synchronize results")
			.version("1.0.0")
			.tags("parallel", "synchronization", "data")
			.manual()
			.task("split-data", {
				type: "split",
				strategy: "hash",
				partitions: 4,
			})
			.parallel(
				"parallel-processing",
				[
					"process-partition-1",
					"process-partition-2",
					"process-partition-3",
					"process-partition-4",
				],
				{
					dependsOn: ["split-data"],
				},
			)
			.task("process-partition-1", {
				type: "process",
				partition: 1,
				algorithm: "transform-v2",
			})
			.task("process-partition-2", {
				type: "process",
				partition: 2,
				algorithm: "transform-v2",
			})
			.task("process-partition-3", {
				type: "process",
				partition: 3,
				algorithm: "transform-v2",
			})
			.task("process-partition-4", {
				type: "process",
				partition: 4,
				algorithm: "transform-v2",
			})
			.task(
				"merge-results",
				{
					type: "merge",
					strategy: "concatenate",
				},
				{
					dependsOn: ["parallel-processing"],
				},
			)
			.condition(
				"validate-merged",
				"output.recordCount == input.expectedCount",
				{
					dependsOn: ["merge-results"],
				},
			)
			.task(
				"final-output",
				{
					type: "output",
					destination: "processed_data_bucket",
				},
				{
					dependsOn: ["validate-merged"],
				},
			)
			.create();

		console.log("[SUCCESS] Created parallel workflow:", parallelWorkflow.id);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 2: Workflow with complex conditional logic and error handling
		console.log(
			"[EXAMPLE] Example 2: Complex conditional logic with error handling",
		);
		const conditionalWorkflow = await workflows
			.define("intelligent-processor")
			.description(
				"Intelligent processor with conditional logic and error handling",
			)
			.version("1.0.0")
			.tags("conditional", "error-handling", "intelligent")
			.event("data.ready", { priority: "high" })
			.task("classify-input", {
				type: "classification",
				model: "input-classifier-v3",
				confidence_threshold: 0.8,
			})
			.condition(
				"is-high-value",
				"output.value > 10000 && output.confidence > 0.9",
				{
					dependsOn: ["classify-input"],
				},
			)
			.condition(
				"is-standard",
				"output.value <= 10000 && output.confidence > 0.7",
				{
					dependsOn: ["classify-input"],
				},
			)
			.condition("is-low-confidence", "output.confidence <= 0.7", {
				dependsOn: ["classify-input"],
			})
			.parallel(
				"conditional-processing",
				["high-value-processing", "standard-processing", "manual-review"],
				{
					dependsOn: ["is-high-value", "is-standard", "is-low-confidence"],
				},
			)
			.task(
				"high-value-processing",
				{
					type: "premium-processing",
					priority: "urgent",
					verification: "enhanced",
					retryPolicy: {
						maxAttempts: 3,
						backoff: "exponential",
					},
				},
				{
					timeout: "10m",
				},
			)
			.task(
				"standard-processing",
				{
					type: "standard-processing",
					priority: "normal",
					retryPolicy: {
						maxAttempts: 2,
						backoff: "linear",
					},
				},
				{
					timeout: "5m",
				},
			)
			.approval("manual-review", ["review-team@company.com"], {
				name: "Manual Review Required",
				description: "Low confidence input requires manual review",
				timeout: "24h",
			})
			.task(
				"consolidate-results",
				{
					type: "consolidation",
					strategy: "merge-by-type",
				},
				{
					dependsOn: ["conditional-processing"],
				},
			)
			.notification(
				"notify-completion",
				"Processing completed successfully",
				["webhook"],
				{
					dependsOn: ["consolidate-results"],
				},
			)
			.create();

		console.log(
			"[SUCCESS] Created conditional workflow:",
			conditionalWorkflow.id,
		);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 3: Dynamic workflow with runtime modifications
		console.log(
			"[EXAMPLE] Example 3: Dynamic workflow with runtime modifications",
		);
		const dynamicWorkflow = await workflows
			.define("dynamic-adapter")
			.description("Dynamically adapts processing based on runtime conditions")
			.version("1.0.0")
			.tags("dynamic", "adaptive", "runtime")
			.webhook("https://api.example.com/webhooks/dynamic")
			.task("analyze-requirements", {
				type: "analysis",
				dimensions: ["complexity", "volume", "latency"],
			})
			.condition("needs-scaling", "output.volume > 1000000", {
				dependsOn: ["analyze-requirements"],
			})
			.condition("needs-optimization", "output.complexity > 0.8", {
				dependsOn: ["analyze-requirements"],
			})
			.condition(
				"standard-processing",
				"output.volume <= 1000000 && output.complexity <= 0.8",
				{
					dependsOn: ["analyze-requirements"],
				},
			)
			.task(
				"scale-infrastructure",
				{
					type: "infrastructure",
					action: "scale-out",
					target_instances: "{{computed_instances}}",
				},
				{
					dependsOn: ["needs-scaling"],
				},
			)
			.task(
				"optimize-algorithms",
				{
					type: "optimization",
					strategies: ["parallel", "caching", "indexing"],
				},
				{
					dependsOn: ["needs-optimization"],
				},
			)
			.task(
				"standard-execution",
				{
					type: "processing",
					algorithm: "standard-v1",
				},
				{
					dependsOn: ["standard-processing"],
				},
			)
			.parallel(
				"adaptive-processing",
				["scaled-processing", "optimized-processing", "standard-execution"],
				{
					dependsOn: [
						"scale-infrastructure",
						"optimize-algorithms",
						"standard-execution",
					],
				},
			)
			.task("scaled-processing", {
				type: "processing",
				algorithm: "distributed-v2",
				instances: "{{scaled_instances}}",
			})
			.task("optimized-processing", {
				type: "processing",
				algorithm: "optimized-v3",
				features: ["caching", "prefetching"],
			})
			.task(
				"adapt-results",
				{
					type: "adaptation",
					strategy: "dynamic-merge",
				},
				{
					dependsOn: ["adaptive-processing"],
				},
			)
			.create();

		console.log("[SUCCESS] Created dynamic workflow:", dynamicWorkflow.id);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 4: Workflow with comprehensive error handling
		console.log("[EXAMPLE] Example 4: Comprehensive error handling workflow");
		const errorHandlingWorkflow = await workflows
			.define("resilient-processor")
			.description("Processor with comprehensive error handling and recovery")
			.version("1.0.0")
			.tags("error-handling", "resilience", "recovery")
			.schedule("*/15 * * * *") // Every 15 minutes
			.task("validate-environment", {
				type: "health-check",
				services: ["database", "cache", "storage"],
			})
			.condition("environment-healthy", "output.all_healthy == true", {
				dependsOn: ["validate-environment"],
			})
			.task(
				"backup-data",
				{
					type: "backup",
					strategy: "incremental",
					retryPolicy: {
						maxAttempts: 5,
						backoff: "exponential",
					},
				},
				{
					dependsOn: ["environment-healthy"],
				},
			)
			.task(
				"process-data",
				{
					type: "processing",
					algorithm: "main-v2",
					retryPolicy: {
						maxAttempts: 3,
						backoff: "exponential",
					},
				},
				{
					dependsOn: ["backup-data"],
					timeout: "30m",
				},
			)
			.condition("processing-successful", "output.status == 'success'", {
				dependsOn: ["process-data"],
			})
			.condition("processing-failed", "output.status == 'failed'", {
				dependsOn: ["process-data"],
			})
			.task(
				"handle-success",
				{
					type: "success-handling",
					actions: ["cleanup", "notify", "archive"],
				},
				{
					dependsOn: ["processing-successful"],
				},
			)
			.task(
				"handle-failure",
				{
					type: "error-handling",
					strategy: "rollback",
				},
				{
					dependsOn: ["processing-failed"],
				},
			)
			.approval("manual-intervention", ["ops-team@company.com"], {
				name: "Manual Intervention Required",
				description: "Automatic recovery failed, manual intervention needed",
				dependsOn: ["handle-failure"],
				timeout: "2h",
			})
			.task(
				"restore-backup",
				{
					type: "restore",
					strategy: "point-in-time",
				},
				{
					dependsOn: ["manual-intervention"],
				},
			)
			.notification(
				"alert-ops",
				"Processing workflow requires attention",
				["pagerduty", "slack"],
				{
					dependsOn: ["handle-failure", "manual-intervention"],
				},
			)
			.create();

		console.log(
			"[SUCCESS] Created error handling workflow:",
			errorHandlingWorkflow.id,
		);

		console.log(`\n${"=".repeat(50)}\n`);

		// Example 5: Execute and monitor workflows
		console.log("[EXAMPLE] Example 5: Execute and monitor workflows");

		// Trigger the parallel workflow
		const parallelExecution = await workflows
			.workflow(parallelWorkflow.id)
			.trigger({
				dataSource: "user_events",
				dateRange: "2024-01-01:2024-01-31",
				expectedCount: 1000000,
			});

		console.log(
			"[SUCCESS] Triggered parallel execution:",
			parallelExecution.id,
		);

		// Monitor execution progress
		const executionDetails = await workflows
			.workflow(parallelWorkflow.id)
			.execution(parallelExecution.id);
		console.log("[INFO] Execution status:", executionDetails.status);
		console.log(
			"[INFO] Steps completed:",
			executionDetails.stepExecutions.filter((s) => s.status === "completed")
				.length,
		);
		console.log(
			"[INFO] Steps running:",
			executionDetails.stepExecutions.filter((s) => s.status === "running")
				.length,
		);
		console.log(
			"[INFO] Steps pending:",
			executionDetails.stepExecutions.filter((s) => s.status === "pending")
				.length,
		);

		// Show step details
		for (const step of executionDetails.stepExecutions) {
			console.log(`  - ${step.stepId}: ${step.status}`);
			if (step.durationMs) {
				console.log(`    Duration: ${step.durationMs}ms`);
			}
			if (step.error) {
				console.log(`    Error: ${step.error}`);
			}
		}
	} catch (error) {
		console.error("[ERROR] Unexpected error:", error);
	}
}

// Run the example
if (import.meta.main) {
	advancedWorkflowPatterns();
}

export { advancedWorkflowPatterns };
