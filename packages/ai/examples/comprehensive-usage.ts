/**
 * Comprehensive Usage Example
 *
 * Combines text generation with a structured decision in one flow: a support
 * ticket is classified, then a reply is drafted only when the decision says a
 * human is not needed.
 */

import { FrontalError } from "@frontal-labs/core";
import { ai, choice, noul, score } from "../src";

async function comprehensiveUsageExample() {
	const ticket = "I was charged twice this month. Please fix this ASAP.";

	try {
		// Step 1: decide the category, severity, and whether it is billing.
		const decision = await ai.decisions.decide({
			model: "frontal-labs/decision-4B",
			state: { ticket },
			questions: {
				billing: noul("Is this about billing?"),
				category: choice("What is this ticket about?", {
					billing: null,
					technical: null,
					other: null,
				}),
				severity: score("How severe is it?", ["low", "medium", "high"]),
			},
		});
		console.log("Category:", decision.answers.category.choice);
		console.log("Severity:", decision.answers.severity.level);
		console.log("Request id:", decision.requestId);

		// Step 2: draft a reply only for low-severity, non-billing tickets.
		if (
			decision.answers.severity.level === "low" &&
			decision.answers.billing.noul < 0.5
		) {
			const reply = await ai.generateText({
				model: "gpt-4o-mini",
				prompt: `Draft a short reply to this ticket: ${ticket}`,
			});
			console.log("Draft:", reply.text);
		} else {
			console.log("Routed to a human for review.");
		}
	} catch (error) {
		if (error instanceof FrontalError) {
			console.error(`API error ${error.statusCode}: ${error.message}`);
		} else {
			throw error;
		}
	}
}

comprehensiveUsageExample();
