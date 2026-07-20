import { createAgentsClient } from "../packages/agents/src";
import { createAIClient } from "../packages/ai/src";
import { createBlobClient } from "../packages/blob/src";
import { createGraphClient } from "../packages/graph/src";
import { createOntologyClient } from "../packages/ontology/src";
import { createPipelinesClient } from "../packages/pipelines/src";
import { createWorkflowsClient } from "../packages/workflows/src";

type CheckStatus = "pass" | "warn" | "fail" | "skip";

type CheckResult = {
	name: string;
	status: CheckStatus;
	message: string;
};

const apiKey = process.env.FRONTAL_API_KEY;
if (!apiKey) {
	console.error("Missing FRONTAL_API_KEY");
	process.exit(1);
}

const apiBaseUrl = process.env.FRONTAL_API_URL ?? "https://api.frontal.dev/v1";
const aiBaseUrl = process.env.FRONTAL_AI_API_URL ?? "https://ai.frontal.dev";
const graphEntityType = process.env.FRONTAL_GRAPH_ENTITY_TYPE;
const blobBucket = process.env.FRONTAL_BLOB_BUCKET;

const checks: Array<() => Promise<CheckResult>> = [
	async () => {
		const ai = createAIClient({ apiKey, baseUrl: aiBaseUrl });
		return runCheck("ai.listModels", async () => {
			await ai.listModels();
		});
	},
	async () => {
		const agents = createAgentsClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("agents.list", async () => {
			await agents.list({ limit: 1 });
		});
	},
	async () => {
		if (!graphEntityType) {
			return {
				name: "graph.query",
				status: "skip",
				message:
					"Set FRONTAL_GRAPH_ENTITY_TYPE to run graph compatibility check",
			};
		}
		const graph = createGraphClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("graph.query", async () => {
			await graph.query({ entityType: graphEntityType, limit: 1 });
		});
	},
	async () => {
		const ontology = createOntologyClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("ontology.list", async () => {
			await ontology.list({ limit: 1 });
		});
	},
	async () => {
		const pipelines = createPipelinesClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("pipelines.list", async () => {
			await pipelines.list({ limit: 1 });
		});
	},
	async () => {
		const workflows = createWorkflowsClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("workflows.list", async () => {
			await workflows.list({ limit: 1 });
		});
	},
	async () => {
		if (!blobBucket) {
			return {
				name: "blob.list",
				status: "skip",
				message: "Set FRONTAL_BLOB_BUCKET to run blob compatibility check",
			};
		}
		const blob = createBlobClient({ apiKey, baseUrl: apiBaseUrl });
		return runCheck("blob.list", async () => {
			await blob.list(blobBucket);
		});
	},
];

async function runCheck(
	name: string,
	fn: () => Promise<void>,
): Promise<CheckResult> {
	try {
		await fn();
		return { name, status: "pass", message: "OK" };
	} catch (error) {
		const parsed = classifyError(error);
		return { name, ...parsed };
	}
}

function classifyError(error: unknown): Omit<CheckResult, "name"> {
	const status = getStatusCode(error);
	const message = getMessage(error);

	if (status === 404) {
		return {
			status: "fail",
			message: `404 route mismatch (${message})`,
		};
	}

	if (status === 401 || status === 403) {
		return {
			status: "warn",
			message: `${status} auth/permission (${message})`,
		};
	}

	if (status !== null && status >= 400 && status < 500) {
		return {
			status: "warn",
			message: `${status} request rejected (${message})`,
		};
	}

	if (status !== null && status >= 500) {
		return {
			status: "fail",
			message: `${status} server error (${message})`,
		};
	}

	return {
		status: "fail",
		message: message || "network/transport failure",
	};
}

function getStatusCode(error: unknown): number | null {
	if (typeof error !== "object" || error === null) return null;
	const statusCode = (error as { statusCode?: unknown }).statusCode;
	return typeof statusCode === "number" ? statusCode : null;
}

function getMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function format(result: CheckResult): string {
	const icon =
		result.status === "pass"
			? "PASS"
			: result.status === "warn"
				? "WARN"
				: result.status === "skip"
					? "SKIP"
					: "FAIL";
	return `${icon.padEnd(4)} ${result.name} - ${result.message}`;
}

const results = await Promise.all(checks.map((check) => check()));
for (const result of results) {
	console.log(format(result));
}

const hasFailure = results.some((r) => r.status === "fail");
if (hasFailure) {
	process.exit(2);
}
