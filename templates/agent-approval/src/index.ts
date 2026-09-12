import { Frontal, toApprovalStep, tool } from "@frontal-labs/sdk";
import { z } from "zod";

/**
 * Ticket triage with a human in the loop:
 *   1. define a typed agent (state schema + tools + approveWhen)
 *   2. create a workflow whose approval step mirrors the agent's contract
 *   3. run the agent, and when the state needs sign-off, list the pending
 *      approval and approve it.
 */
export async function run(f: Frontal) {
  const stateSchema = z.object({ tier: z.string(), score: z.number() });

  const triage = await f.agents
    .define("ticket-triager", {
      description: "Classifies and routes support tickets",
      triggers: "support.ticket.created",
      stateSchema,
      tools: {
        classify: tool({
          description: "Classify a ticket",
          inputSchema: z.object({ text: z.string() }),
        }),
      },
      approveWhen: (s) => s.tier === "enterprise" || s.score < 0.5,
      approvers: ["support-leads"],
    })
    .create();

  const step = toApprovalStep("ticket-triager", triage.hints);
  const review = await f.workflows
    .define("triage-review")
    .manual()
    .approval(step.id, step.config.approvers, { name: step.name })
    .create();

  const runInfo = await triage.message("support.ticket.created", {
    ticketId: "t_987",
    text: "Payment failed after plan upgrade",
  });

  let needsHuman = false;
  for await (const part of triage.watch(runInfo.id)) {
    if (part.type === "state" && triage.requiresApproval(part.state)) {
      needsHuman = true;
    }
    if (part.type === "error") {
      throw new Error(`${part.error.code}: ${part.error.fix ?? part.error.message}`);
    }
  }

  let approved: string[] = [];
  if (needsHuman) {
    const pending = await f.workflows.approvals.list({ status: "pending" });
    for (const a of pending.data) {
      await f.workflows.approvals.approve(a.id, "Reviewed by support lead");
      approved.push(a.id);
    }
  }

  return { agentId: triage.id, workflowId: review.id, runId: runInfo.id, needsHuman, approved };
}

if (import.meta.main) {
  const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
  console.log(await run(f));
}
